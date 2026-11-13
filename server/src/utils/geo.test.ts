import { describe, expect, it } from 'vitest';
import { distanceInMeters } from './geo';

describe('distanceInMeters', () => {
  it('is 0 for the same point', () => {
    const p = { latitude: 36.8913, longitude: 10.1879 };
    expect(distanceInMeters(p, p)).toBe(0);
  });

  it('matches a known distance (Tunis centre → SUP’COM ≈ 10 km)', () => {
    const tunis = { latitude: 36.8008, longitude: 10.18 };
    const supcom = { latitude: 36.8913, longitude: 10.1879 };
    expect(distanceInMeters(tunis, supcom)).toBeGreaterThan(9_900);
    expect(distanceInMeters(tunis, supcom)).toBeLessThan(10_200);
  });
});
