import {
  CONFIDENCE_HIGH_FROM_WEIGHT,
  CONFIDENCE_MEDIUM_FROM_WEIGHT,
  DECAY_TIME_CONSTANT_MINUTES,
  LIVE_WINDOW_MINUTES,
  MINUTE_MS,
  MODERE_FROM_PERCENT,
  SATURE_FROM_PERCENT,
  type CrowdLevel,
} from './live-meter.constants';

export interface OccupancyReport {
  /** Percent, 0–100 (25, 55 or 85 for real reports). */
  occupancy: number;
  createdAt: Date;
}

export interface OccupancyEstimate {
  /** Weighted average, not rounded (rounding is a display concern). */
  occupancy: number;
  /** How many reports were taken into account (age ≤ 2 h). */
  reportCount: number;
  /** Most recent report used, for "il y a 10 min". */
  lastReportAt: Date;
  /** Σ weights: how much evidence backs the estimate (≈ 1 per fresh report). */
  totalWeight: number;
}

/**
 * Live Meter estimate: a weighted average where recent reports count more than old ones.
 *
 * Each report gets a weight that fades with its age:
 *
 *     weight = exp(−age / 30 min)
 *
 *   a brand-new report weighs 1, a 30-min-old one ≈ 0.37, a 1-hour-old one ≈ 0.14.
 *   Reports older than 2 hours are ignored completely.
 *
 * The estimate is then the classic weighted average:
 *
 *     estimate = Σ (weightᵢ × occupancyᵢ) / Σ weightᵢ
 *
 * Worked example (it is a unit test): now = 15:00,
 *   14:00 → 80 %   age 60 min   weight e^(−2)   ≈ 0.135
 *   14:30 → 50 %   age 30 min   weight e^(−1)   ≈ 0.368
 *   14:50 → 40 %   age 10 min   weight e^(−1/3) ≈ 0.717
 *   estimate = (10.8 + 18.4 + 28.7) / 1.220 ≈ 47 %
 *
 * The function is pure: no database, no clock. `now` is a parameter so tests are deterministic.
 * It returns `null` when no report is recent enough; the caller then falls back to the
 * historical average ("Estimation habituelle").
 */
export function computeOccupancy(
  reports: readonly OccupancyReport[],
  now: Date,
): OccupancyEstimate | null {
  let weightedSum = 0;
  let totalWeight = 0;
  let reportCount = 0;
  let lastReportAt: Date | null = null;

  for (const report of reports) {
    // A report "from the future" (clocks slightly out of sync) is treated as brand new,
    // otherwise its weight would be greater than 1.
    const ageMinutes = Math.max(0, (now.getTime() - report.createdAt.getTime()) / MINUTE_MS);
    if (ageMinutes > LIVE_WINDOW_MINUTES) continue;

    const weight = Math.exp(-ageMinutes / DECAY_TIME_CONSTANT_MINUTES);
    weightedSum += weight * report.occupancy;
    totalWeight += weight;
    reportCount += 1;
    if (lastReportAt === null || report.createdAt > lastReportAt) lastReportAt = report.createdAt;
  }

  if (reportCount === 0 || lastReportAt === null) return null;

  return { occupancy: weightedSum / totalWeight, reportCount, lastReportAt, totalWeight };
}

/** Word shown next to a percentage: < 40 calme, 40–69 modéré, ≥ 70 saturé. */
export function crowdLevelFor(occupancyPercent: number): CrowdLevel {
  const rounded = Math.round(occupancyPercent);
  if (rounded >= SATURE_FROM_PERCENT) return 'sature';
  if (rounded >= MODERE_FROM_PERCENT) return 'modere';
  return 'calme';
}

export type Confidence = 'faible' | 'moyenne' | 'bonne';

/** How much to trust a live estimate, from Σ weights (see live-meter.constants.ts). */
export function confidenceFor(totalWeight: number): Confidence {
  if (totalWeight >= CONFIDENCE_HIGH_FROM_WEIGHT) return 'bonne';
  if (totalWeight >= CONFIDENCE_MEDIUM_FROM_WEIGHT) return 'moyenne';
  return 'faible';
}
