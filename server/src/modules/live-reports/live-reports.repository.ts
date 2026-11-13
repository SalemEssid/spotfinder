import { pool, type Queryable } from '../../db/pool';
import { BUSINESS_TIME_ZONE } from '../../live-meter/live-meter.constants';

export interface ReportRow {
  spot_id: number;
  occupancy: number;
  created_at: Date;
}

/** Reports of several spots created after `since` (the live window). */
export async function findReportsSince(spotIds: number[], since: Date): Promise<ReportRow[]> {
  if (spotIds.length === 0) return [];
  const { rows } = await pool.query<ReportRow>(
    `SELECT spot_id, occupancy, created_at
     FROM live_reports
     WHERE spot_id = ANY($1::int[]) AND created_at > $2`,
    [spotIds, since],
  );
  return rows;
}

/**
 * "Estimation habituelle": average occupancy of past reports made on the same weekday and in the
 * same hour as `now` (Tunis time), between `historyStart` and `windowStart`.
 * Places with fewer than `minReports` such reports are left out.
 */
export async function findHistoricalAverages(
  spotIds: number[],
  now: Date,
  historyStart: Date,
  windowStart: Date,
  minReports: number,
): Promise<Map<number, { average: number; count: number }>> {
  if (spotIds.length === 0) return new Map();
  const { rows } = await pool.query<{ spot_id: number; average: number; count: number }>(
    `SELECT spot_id, AVG(occupancy)::float8 AS average, COUNT(*)::int AS count
     FROM live_reports
     WHERE spot_id = ANY($1::int[])
       AND created_at >= $3 AND created_at <= $4
       AND EXTRACT(DOW  FROM created_at AT TIME ZONE '${BUSINESS_TIME_ZONE}')
         = EXTRACT(DOW  FROM $2::timestamptz AT TIME ZONE '${BUSINESS_TIME_ZONE}')
       AND EXTRACT(HOUR FROM created_at AT TIME ZONE '${BUSINESS_TIME_ZONE}')
         = EXTRACT(HOUR FROM $2::timestamptz AT TIME ZONE '${BUSINESS_TIME_ZONE}')
     GROUP BY spot_id
     HAVING COUNT(*) >= $5`,
    [spotIds, now, historyStart, windowStart, minReports],
  );
  return new Map(rows.map((row) => [row.spot_id, { average: row.average, count: row.count }]));
}

/**
 * Average occupancy per hour for one weekday (Tunis time), for the "affluence par heure" chart.
 */
export async function findHourlyAverages(
  spotId: number,
  weekday: number,
  historyStart: Date,
): Promise<{ hour: number; average: number; count: number }[]> {
  const { rows } = await pool.query<{ hour: number; average: number; count: number }>(
    `SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE '${BUSINESS_TIME_ZONE}')::int AS hour,
            AVG(occupancy)::float8 AS average,
            COUNT(*)::int AS count
     FROM live_reports
     WHERE spot_id = $1
       AND created_at >= $3
       AND EXTRACT(DOW FROM created_at AT TIME ZONE '${BUSINESS_TIME_ZONE}') = $2
     GROUP BY hour
     ORDER BY hour`,
    [spotId, weekday, historyStart],
  );
  return rows;
}

export async function findLastReportAt(db: Queryable, spotId: number, userId: number): Promise<Date | null> {
  const { rows } = await db.query<{ created_at: Date }>(
    `SELECT created_at FROM live_reports
     WHERE spot_id = $1 AND user_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [spotId, userId],
  );
  return rows[0]?.created_at ?? null;
}

export async function insertReport(
  db: Queryable,
  report: { spotId: number; userId: number; occupancy: number; createdAt: Date },
): Promise<void> {
  await db.query('INSERT INTO live_reports (spot_id, user_id, occupancy, created_at) VALUES ($1, $2, $3, $4)', [
    report.spotId,
    report.userId,
    report.occupancy,
    report.createdAt,
  ]);
}
