import { makeMeter } from '../testing/fixtures';
import { applyOptimisticReport, crowdBadgeText, isFreshReport, levelFor } from './live-meter';

const NOW = new Date('2026-11-12T15:00:00Z');

describe('levelFor (same thresholds as the server)', () => {
  it.each([
    [39, 'calme'],
    [40, 'modere'],
    [69, 'modere'],
    [70, 'sature'],
  ] as const)('%s %% → %s', (percent, level) => {
    expect(levelFor(percent)).toBe(level);
  });
});

describe('crowdBadgeText', () => {
  it('pairs the percentage with a word', () => {
    expect(crowdBadgeText(makeMeter({ occupancy: 47, level: 'modere' }))).toBe('≈ 47 % · Modéré');
  });

  it('says it is the usual level when there is no recent report', () => {
    expect(crowdBadgeText(makeMeter({ source: 'habituel', occupancy: 28, level: 'calme' }))).toBe(
      'Habituel · Calme',
    );
  });

  it('says so when there is no data at all', () => {
    expect(crowdBadgeText(makeMeter({ source: 'aucun', occupancy: null, level: null }))).toBe(
      'Pas de signalement',
    );
  });
});

describe('applyOptimisticReport', () => {
  it('with no live data, the new report is the whole estimate', () => {
    const meter = applyOptimisticReport(
      makeMeter({ source: 'habituel', occupancy: 30, totalWeight: 0 }),
      85,
      NOW,
    );
    expect(meter).toMatchObject({
      source: 'live',
      occupancy: 85,
      level: 'sature',
      reportCount: 1,
      totalWeight: 1,
    });
    expect(meter.lastReportAt).toBe(NOW.toISOString());
  });

  it('blends the new report (weight 1) with the current estimate (weight Σw)', () => {
    // (47 × 1.22 + 85 × 1) / 2.22 ≈ 64
    const meter = applyOptimisticReport(
      makeMeter({ occupancy: 47, level: 'modere', totalWeight: 1.22, reportCount: 3 }),
      85,
      NOW,
    );
    expect(meter.occupancy).toBe(64);
    expect(meter.reportCount).toBe(4);
    expect(meter.totalWeight).toBeCloseTo(2.22);
    expect(meter.confidence).toBe('bonne');
  });
});

describe('isFreshReport', () => {
  it('is true for a report less than 15 minutes old', () => {
    expect(isFreshReport(makeMeter({ lastReportAt: '2026-11-12T14:50:00Z' }), NOW)).toBe(true);
    expect(isFreshReport(makeMeter({ lastReportAt: '2026-11-12T14:30:00Z' }), NOW)).toBe(false);
    expect(isFreshReport(makeMeter({ source: 'habituel', lastReportAt: null }), NOW)).toBe(false);
  });
});
