import type { CrowdLevel, LiveMeter, ReportChoice } from '../models/spot.model';

/** Same rules as the server (server/src/live-meter/live-meter.constants.ts). */
export const MODERE_FROM_PERCENT = 40;
export const SATURE_FROM_PERCENT = 70;
const CONFIDENCE_MEDIUM_FROM_WEIGHT = 0.5;
const CONFIDENCE_HIGH_FROM_WEIGHT = 1.5;
/** A pin "pulses" when its last report is this recent. */
export const FRESH_REPORT_MINUTES = 15;

export const LEVEL_LABELS: Record<CrowdLevel, string> = {
  calme: 'Calme',
  modere: 'Modéré',
  sature: 'Saturé',
};

export const REPORT_CHOICES: { value: ReportChoice; label: string; occupancy: number; hint: string }[] = [
  { value: 'calme', label: 'Calme', occupancy: 25, hint: 'Beaucoup de places libres' },
  { value: 'moyen', label: 'Moyen', occupancy: 55, hint: 'Quelques places libres' },
  { value: 'sature', label: 'Saturé', occupancy: 85, hint: 'Difficile de trouver une place' },
];

export function levelFor(percent: number): CrowdLevel {
  const rounded = Math.round(percent);
  if (rounded >= SATURE_FROM_PERCENT) return 'sature';
  if (rounded >= MODERE_FROM_PERCENT) return 'modere';
  return 'calme';
}

/** "≈ 30 % · Calme", "Habituel · Calme", "Pas de signalement". Colour is never shown without these words. */
export function crowdBadgeText(meter: LiveMeter): string {
  if (meter.source === 'aucun' || meter.occupancy === null || meter.level === null) return 'Pas de signalement';
  if (meter.source === 'habituel') return `Habituel · ${LEVEL_LABELS[meter.level]}`;
  return `≈ ${meter.occupancy} % · ${LEVEL_LABELS[meter.level]}`;
}

/**
 * Optimistic update after "Je suis ici": shows the new estimate immediately, before the server answers.
 *
 * A brand-new report has weight exp(0) = 1, so the server will compute
 *     new = (Σwᵢ·xᵢ + 1·x) / (Σwᵢ + 1) = (old × W + x) / (W + 1)
 * where W = totalWeight of the current live estimate (0 if there is no live data).
 * The server's answer then replaces this value (or the old one is restored on error).
 */
export function applyOptimisticReport(meter: LiveMeter, occupancy: number, now: Date): LiveMeter {
  const isLive = meter.source === 'live' && meter.occupancy !== null;
  const weight = isLive ? meter.totalWeight : 0;
  const estimate = isLive ? (meter.occupancy! * weight + occupancy) / (weight + 1) : occupancy;
  const totalWeight = weight + 1;
  return {
    source: 'live',
    occupancy: Math.round(estimate),
    level: levelFor(estimate),
    reportCount: isLive ? meter.reportCount + 1 : 1,
    lastReportAt: now.toISOString(),
    totalWeight,
    confidence:
      totalWeight >= CONFIDENCE_HIGH_FROM_WEIGHT
        ? 'bonne'
        : totalWeight >= CONFIDENCE_MEDIUM_FROM_WEIGHT
          ? 'moyenne'
          : 'faible',
  };
}

export function isFreshReport(meter: LiveMeter, now: Date): boolean {
  if (meter.source !== 'live' || !meter.lastReportAt) return false;
  return now.getTime() - new Date(meter.lastReportAt).getTime() < FRESH_REPORT_MINUTES * 60_000;
}
