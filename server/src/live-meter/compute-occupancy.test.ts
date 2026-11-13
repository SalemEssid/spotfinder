import { describe, expect, it } from 'vitest';
import { computeOccupancy, confidenceFor, crowdLevelFor } from './compute-occupancy';

/** Builds a Date on a fixed day so every test is deterministic. */
const at = (time: string) => new Date(`2026-11-12T${time}:00Z`);

describe('computeOccupancy', () => {
  it('reproduces the worked example from the brief (≈ 47 %)', () => {
    const now = at('15:00');
    const estimate = computeOccupancy(
      [
        { occupancy: 80, createdAt: at('14:00') },
        { occupancy: 50, createdAt: at('14:30') },
        { occupancy: 40, createdAt: at('14:50') },
      ],
      now,
    );

    expect(estimate).not.toBeNull();
    expect(estimate!.occupancy).toBeCloseTo(47.45, 1);
    expect(Math.round(estimate!.occupancy)).toBe(47);
    expect(estimate!.reportCount).toBe(3);
    expect(estimate!.lastReportAt).toEqual(at('14:50'));
    // weights ≈ 0.135 + 0.368 + 0.717
    expect(estimate!.totalWeight).toBeCloseTo(1.22, 2);
  });

  it('returns null when there is no report', () => {
    expect(computeOccupancy([], at('15:00'))).toBeNull();
  });

  it('ignores reports older than 2 hours', () => {
    const estimate = computeOccupancy(
      [
        { occupancy: 85, createdAt: at('12:30') }, // 2 h 30 ago → ignored
        { occupancy: 25, createdAt: at('14:40') },
      ],
      at('15:00'),
    );
    expect(estimate!.occupancy).toBe(25);
    expect(estimate!.reportCount).toBe(1);
  });

  it('keeps a report that is exactly 2 hours old', () => {
    const estimate = computeOccupancy([{ occupancy: 55, createdAt: at('13:00') }], at('15:00'));
    expect(estimate!.reportCount).toBe(1);
  });

  it('returns null when every report is too old', () => {
    expect(computeOccupancy([{ occupancy: 55, createdAt: at('10:00') }], at('15:00'))).toBeNull();
  });

  it('treats a report from the future as brand new (weight 1, not more)', () => {
    const estimate = computeOccupancy([{ occupancy: 85, createdAt: at('15:05') }], at('15:00'));
    expect(estimate!.totalWeight).toBe(1);
    expect(estimate!.occupancy).toBe(85);
  });

  it('gives more influence to a recent report than to an old one', () => {
    const estimate = computeOccupancy(
      [
        { occupancy: 85, createdAt: at('13:30') },
        { occupancy: 25, createdAt: at('14:55') },
      ],
      at('15:00'),
    );
    expect(estimate!.occupancy).toBeLessThan(40);
  });
});

describe('crowdLevelFor', () => {
  it.each([
    [0, 'calme'],
    [39, 'calme'],
    [39.4, 'calme'],
    [39.6, 'modere'], // rounds to 40: the label always matches the number displayed
    [40, 'modere'],
    [69, 'modere'],
    [70, 'sature'],
    [100, 'sature'],
  ] as const)('%s %% → %s', (percent, level) => {
    expect(crowdLevelFor(percent)).toBe(level);
  });
});

describe('confidenceFor', () => {
  it.each([
    [0.14, 'faible'], // a single report from an hour ago
    [0.72, 'moyenne'], // a single report from 10 minutes ago
    [1.22, 'moyenne'], // the worked example
    [2.5, 'bonne'], // several fresh reports
  ] as const)('Σweights %s → %s', (weight, confidence) => {
    expect(confidenceFor(weight)).toBe(confidence);
  });
});
