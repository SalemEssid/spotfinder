import { formatDistance, formatRelativeTime, formatTime, initials, minutesUntil } from './format';

describe('formatDistance', () => {
  it.each([
    [346, '350 m'],
    [912, '910 m'],
    [997, '1 km'], // not "1000 m"
    [1236, '1,2 km'],
    [10232, '10 km'],
  ])('%s m → %s', (meters, text) => {
    expect(formatDistance(meters)).toBe(text);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-11-12T15:00:00Z');
  it.each([
    ['2026-11-12T14:59:40Z', 'à l’instant'],
    ['2026-11-12T14:50:00Z', 'il y a 10 min'],
    ['2026-11-12T14:00:00Z', 'il y a 1 h'],
    ['2026-11-12T13:55:00Z', 'il y a 1 h 05'],
    ['2026-11-10T15:00:00Z', 'il y a 2 j'],
  ])('%s → %s', (iso, text) => {
    expect(formatRelativeTime(iso, now)).toBe(text);
  });
});

describe('small formatters', () => {
  it('rounds minutes up for "dans 9 min"', () => {
    expect(minutesUntil('2026-11-12T15:08:10Z', new Date('2026-11-12T15:00:00Z'))).toBe(9);
    expect(minutesUntil('2026-11-12T14:00:00Z', new Date('2026-11-12T15:00:00Z'))).toBe(0);
  });

  it('says "minuit" for 24:00', () => {
    expect(formatTime('24:00')).toBe('minuit');
    expect(formatTime('18:30')).toBe('18:30');
  });

  it('builds initials for the avatar', () => {
    expect(initials('Yasmine B.')).toBe('YB');
    expect(initials('Compte Démo')).toBe('CD');
  });
});
