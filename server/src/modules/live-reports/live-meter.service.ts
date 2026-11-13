import { pool, withTransaction } from '../../db/pool';
import { tunisWeekdayAndHour } from '../../live-meter/business-time';
import {
  computeOccupancy,
  confidenceFor,
  crowdLevelFor,
  type Confidence,
} from '../../live-meter/compute-occupancy';
import {
  HISTORY_MIN_REPORTS,
  HISTORY_WEEKS,
  LIVE_WINDOW_MINUTES,
  MINUTE_MS,
  OCCUPANCY_BY_CHOICE,
  REPORT_COOLDOWN_MINUTES,
  type CrowdLevel,
  type ReportChoice,
} from '../../live-meter/live-meter.constants';
import { HttpError, notFound } from '../../utils/http-error';
import { spotExists } from '../spots/spots.repository';
import {
  findHistoricalAverages,
  findHourlyAverages,
  findLastReportAt,
  findReportsSince,
  insertReport,
} from './live-reports.repository';

/** What the API sends for the Live Meter of one place. */
export interface LiveMeterDto {
  /** live = recent reports · habituel = historical average · aucun = no data. */
  source: 'live' | 'habituel' | 'aucun';
  /** Rounded percent, null when source is "aucun". */
  occupancy: number | null;
  level: CrowdLevel | null;
  /** live: reports used · habituel: size of the historical sample. */
  reportCount: number;
  lastReportAt: string | null;
  /** Σ weights of the live estimate (0 otherwise). Lets the client update the meter optimistically. */
  totalWeight: number;
  confidence: Confidence | null;
}

const NO_DATA: LiveMeterDto = {
  source: 'aucun',
  occupancy: null,
  level: null,
  reportCount: 0,
  lastReportAt: null,
  totalWeight: 0,
  confidence: null,
};

const minutesBefore = (date: Date, minutes: number) => new Date(date.getTime() - minutes * MINUTE_MS);

/**
 * Live Meter of several places at once (3 queries in total, whatever the number of places):
 * 1. recent reports → computeOccupancy()
 * 2. places without recent reports → historical average for this weekday and hour
 * 3. otherwise → "Pas encore de signalement"
 */
export async function getLiveMeters(spotIds: number[], now: Date): Promise<Map<number, LiveMeterDto>> {
  const windowStart = minutesBefore(now, LIVE_WINDOW_MINUTES);
  const recentRows = await findReportsSince(spotIds, windowStart);

  const reportsBySpot = new Map<number, { occupancy: number; createdAt: Date }[]>();
  for (const row of recentRows) {
    const list = reportsBySpot.get(row.spot_id) ?? [];
    list.push({ occupancy: row.occupancy, createdAt: row.created_at });
    reportsBySpot.set(row.spot_id, list);
  }

  const meters = new Map<number, LiveMeterDto>();
  for (const spotId of spotIds) {
    const estimate = computeOccupancy(reportsBySpot.get(spotId) ?? [], now);
    if (!estimate) continue;
    const occupancy = Math.round(estimate.occupancy);
    meters.set(spotId, {
      source: 'live',
      occupancy,
      level: crowdLevelFor(occupancy),
      reportCount: estimate.reportCount,
      lastReportAt: estimate.lastReportAt.toISOString(),
      totalWeight: Number(estimate.totalWeight.toFixed(3)),
      confidence: confidenceFor(estimate.totalWeight),
    });
  }

  const withoutLiveData = spotIds.filter((id) => !meters.has(id));
  const historyStart = minutesBefore(now, HISTORY_WEEKS * 7 * 24 * 60);
  const averages = await findHistoricalAverages(withoutLiveData, now, historyStart, windowStart, HISTORY_MIN_REPORTS);

  for (const spotId of withoutLiveData) {
    const history = averages.get(spotId);
    if (!history) {
      meters.set(spotId, NO_DATA);
      continue;
    }
    const occupancy = Math.round(history.average);
    meters.set(spotId, {
      ...NO_DATA,
      source: 'habituel',
      occupancy,
      level: crowdLevelFor(occupancy),
      reportCount: history.count,
    });
  }
  return meters;
}

export async function getLiveMeter(spotId: number, now: Date): Promise<LiveMeterDto> {
  return (await getLiveMeters([spotId], now)).get(spotId) ?? NO_DATA;
}

/** When `userId` may report again for this place (null = right now). */
export async function getNextReportAllowedAt(spotId: number, userId: number, now: Date): Promise<Date | null> {
  const last = await findLastReportAt(pool, spotId, userId);
  if (!last) return null;
  const next = new Date(last.getTime() + REPORT_COOLDOWN_MINUTES * MINUTE_MS);
  return next > now ? next : null;
}

/**
 * "Je suis ici": stores a report, enforcing one report per user per place every 15 minutes.
 * Returns the updated Live Meter so the client can replace its optimistic value.
 */
export async function reportCrowd(
  spotId: number,
  userId: number,
  choice: ReportChoice,
  now: Date,
): Promise<{ liveMeter: LiveMeterDto; nextReportAllowedAt: string }> {
  await withTransaction(async (client) => {
    if (!(await spotExists(spotId, client))) throw notFound('Ce lieu n’existe pas.');

    // Lock on (user, place) until the end of the transaction: two simultaneous requests
    // (a double click) are handled one after the other, so the second one sees the first.
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', [userId, spotId]);

    const last = await findLastReportAt(client, spotId, userId);
    if (last) {
      const elapsedMinutes = (now.getTime() - last.getTime()) / MINUTE_MS;
      if (elapsedMinutes < REPORT_COOLDOWN_MINUTES) {
        const nextAllowed = new Date(last.getTime() + REPORT_COOLDOWN_MINUTES * MINUTE_MS);
        const waitMinutes = Math.ceil(REPORT_COOLDOWN_MINUTES - elapsedMinutes);
        throw new HttpError(
          429,
          'REPORT_TOO_SOON',
          `Vous avez déjà signalé l’affluence ici il y a ${Math.floor(elapsedMinutes)} min. ` +
            `Vous pourrez recommencer dans ${waitMinutes} min : cela évite qu’une seule personne fausse la jauge.`,
          {
            meta: {
              retryAfterSeconds: Math.ceil((nextAllowed.getTime() - now.getTime()) / 1000),
              nextReportAllowedAt: nextAllowed.toISOString(),
            },
          },
        );
      }
    }
    await insertReport(client, { spotId, userId, occupancy: OCCUPANCY_BY_CHOICE[choice], createdAt: now });
  });

  return {
    liveMeter: await getLiveMeter(spotId, now),
    nextReportAllowedAt: new Date(now.getTime() + REPORT_COOLDOWN_MINUTES * MINUTE_MS).toISOString(),
  };
}

/**
 * Typical occupancy per hour for today's weekday, plus the calmest upcoming hour
 * ("meilleur moment pour y aller").
 */
export async function getHourlyProfile(spotId: number, now: Date) {
  const { weekday, hour: currentHour } = tunisWeekdayAndHour(now);
  const historyStart = minutesBefore(now, HISTORY_WEEKS * 7 * 24 * 60);
  const rows = await findHourlyAverages(spotId, weekday, historyStart);

  const hours = rows
    .filter((row) => row.count >= HISTORY_MIN_REPORTS)
    .map((row) => ({ hour: row.hour, occupancy: Math.round(row.average), level: crowdLevelFor(row.average) }));

  // The calmest hour from now until closing (ties → the earliest).
  const upcoming = hours.filter((h) => h.hour >= currentHour);
  const bestHour = upcoming.reduce<(typeof hours)[number] | null>(
    (best, h) => (best === null || h.occupancy < best.occupancy ? h : best),
    null,
  );

  return { weekday, currentHour, hours, bestHour: bestHour?.hour ?? null };
}
