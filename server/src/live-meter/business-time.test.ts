import { describe, expect, it } from 'vitest';
import { tunisWeekdayAndHour } from './business-time';

describe('tunisWeekdayAndHour', () => {
  it('converts UTC to Tunis time (UTC+1)', () => {
    // Thursday 12 November 2026, 14:30 UTC = 15:30 in Tunis
    expect(tunisWeekdayAndHour(new Date('2026-11-12T14:30:00Z'))).toEqual({ weekday: 4, hour: 15 });
  });

  it('changes day at midnight Tunis time, not UTC midnight', () => {
    // Saturday 23:30 UTC = Sunday 00:30 in Tunis
    expect(tunisWeekdayAndHour(new Date('2026-11-14T23:30:00Z'))).toEqual({ weekday: 0, hour: 0 });
  });
});
