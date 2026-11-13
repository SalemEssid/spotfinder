/**
 * Every tunable number of the Live Meter, in one place.
 * Changing a rule of the feature should only ever mean changing this file.
 */

/** What a user picks in "Je suis ici". */
export type ReportChoice = 'calme' | 'moyen' | 'sature';

/** The label shown next to an estimate. */
export type CrowdLevel = 'calme' | 'modere' | 'sature';

/** Occupancy (%) stored for each choice. */
export const OCCUPANCY_BY_CHOICE: Record<ReportChoice, number> = {
  calme: 25,
  moyen: 55,
  sature: 85,
};

/**
 * Time constant τ of the decay `weight = exp(−age / τ)`.
 * After τ = 30 min a report keeps e⁻¹ ≈ 37 % of its weight (its "half-life" is τ·ln2 ≈ 21 min).
 */
export const DECAY_TIME_CONSTANT_MINUTES = 30;

/** Reports older than this are ignored by the live estimate. */
export const LIVE_WINDOW_MINUTES = 120;

/** Label thresholds: < 40 % calme, 40–69 % modéré, ≥ 70 % saturé. */
export const MODERE_FROM_PERCENT = 40;
export const SATURE_FROM_PERCENT = 70;

/**
 * Confidence of a live estimate, from the sum of the weights Σwᵢ.
 * One fresh report ≈ 1; one report from an hour ago ≈ 0.14.
 */
export const CONFIDENCE_MEDIUM_FROM_WEIGHT = 0.5;
export const CONFIDENCE_HIGH_FROM_WEIGHT = 1.5;

/** Fallback "Estimation habituelle": same weekday and hour over the last N weeks… */
export const HISTORY_WEEKS = 8;
/** …but only if at least this many reports exist, otherwise the average means nothing. */
export const HISTORY_MIN_REPORTS = 3;

/** One report per user per place every 15 minutes. */
export const REPORT_COOLDOWN_MINUTES = 15;

/** Business time zone: opening hours and "same weekday and hour" are computed in Tunis time. */
export const BUSINESS_TIME_ZONE = 'Africa/Tunis';

export const MINUTE_MS = 60_000;
