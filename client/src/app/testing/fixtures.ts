import type { LiveMeter, SpotDetail, SpotSummary } from '../models/spot.model';

/** Test data builders: a valid object by default, override only what the test is about. */
export function makeMeter(overrides: Partial<LiveMeter> = {}): LiveMeter {
  return {
    source: 'live',
    occupancy: 30,
    level: 'calme',
    reportCount: 3,
    lastReportAt: '2026-11-12T13:50:00.000Z',
    totalWeight: 1.2,
    confidence: 'moyenne',
    ...overrides,
  };
}

export function makeSpot(overrides: Partial<SpotSummary> = {}): SpotSummary {
  return {
    id: 1,
    name: 'Café Le Pupitre',
    type: 'cafe',
    address: 'Rue de la Technologie, El Ghazala',
    area: 'El Ghazala',
    latitude: 36.8942,
    longitude: 10.1893,
    status: 'publie',
    equipment: {
      wifiSpeed: 30,
      outletsCount: 8,
      noiseLevel: 'modere',
      priceLevel: 1,
      airConditioning: true,
    },
    openNow: true,
    closesAt: '22:00',
    ratings: { wifi: 4.2, calm: 3.8, outlets: 3, price: 4, count: 3 },
    liveMeter: makeMeter(),
    distanceMeters: 346,
    ...overrides,
  };
}

export function makeSpotDetail(overrides: Partial<SpotDetail> = {}): SpotDetail {
  return {
    ...makeSpot(),
    description: 'Petit café lumineux.',
    createdAt: '2026-09-01T10:00:00.000Z',
    openingHours: [{ weekday: 1, opensAt: '07:00', closesAt: '22:00' }],
    isFavorite: false,
    hasReviewed: false,
    nextReportAllowedAt: null,
    ...overrides,
  };
}
