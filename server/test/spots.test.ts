import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, newLoggedInUser, seededSpotId } from './helpers';

interface Spot {
  id: number;
  name: string;
  status: string;
  equipment: { noiseLevel: string; wifiSpeed: number; outletsCount: number; priceLevel: number };
  liveMeter: { source: string; occupancy: number | null; level: string | null };
  distanceMeters: number | null;
}

const SUPCOM = { lat: 36.8913, lng: 10.1879 };

describe('GET /api/spots', () => {
  it('lists every seeded place with its Live Meter', async () => {
    const { body } = await request(app).get('/api/spots').expect(200);
    expect(body.length).toBeGreaterThanOrEqual(15); // other test files may add places
    const sources = new Set((body as Spot[]).map((s) => s.liveMeter.source));
    // "habituel" depends on the time of day (history only exists during opening hours):
    // it is tested at a fixed time in live-reports.test.ts.
    expect(sources).toContain('live');
    expect(sources).toContain('aucun');
    for (const source of sources) expect(['live', 'habituel', 'aucun']).toContain(source);
  });

  it('filters by noise, fast Wi-Fi and outlets', async () => {
    const { body } = await request(app).get('/api/spots?bruit=silencieux&wifi=1&prises=1').expect(200);
    expect(body.length).toBeGreaterThan(0);
    for (const spot of body as Spot[]) {
      expect(spot.equipment.noiseLevel).toBe('silencieux');
      expect(spot.equipment.wifiSpeed).toBeGreaterThanOrEqual(20);
      expect(spot.equipment.outletsCount).toBeGreaterThan(0);
    }
  });

  it('filters by budget (free only)', async () => {
    const { body } = await request(app).get('/api/spots?budget=0').expect(200);
    expect((body as Spot[]).every((s) => s.equipment.priceLevel === 0)).toBe(true);
  });

  it('searches text without caring about accents', async () => {
    const { body } = await request(app).get('/api/spots?q=bibliotheque').expect(200);
    expect((body as Spot[]).map((s) => s.name)).toContain('Bibliothèque municipale');
  });

  it('sorts by distance from the reference point', async () => {
    const { body } = await request(app).get(`/api/spots?lat=${SUPCOM.lat}&lng=${SUPCOM.lng}`).expect(200);
    const distances = (body as Spot[]).map((s) => s.distanceMeters!);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(body[0].name).toBe('Café Le Pupitre'); // ≈ 350 m, as in the mockup
  });

  it('rejects an unknown filter value with 400', async () => {
    const { body } = await request(app).get('/api/spots?bruit=assourdissant').expect(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/spots/:id', () => {
  it('returns the detail of a place', async () => {
    const id = await seededSpotId('Médiathèque Ennasr');
    const { body } = await request(app).get(`/api/spots/${id}`).expect(200);
    expect(body.name).toBe('Médiathèque Ennasr');
    // Split opening hours: two slots per open day.
    expect(body.openingHours.filter((h: { weekday: number }) => h.weekday === 1)).toHaveLength(2);
    expect(body.isFavorite).toBe(false);
  });

  it('answers 404 for an unknown place and 400 for an invalid id', async () => {
    await request(app).get('/api/spots/99999').expect(404);
    await request(app).get('/api/spots/abc').expect(400);
  });
});

describe('POST /api/spots', () => {
  const validSpot = {
    name: 'Café du Test',
    type: 'cafe',
    address: '12 rue des Tests, Ariana',
    area: 'Ariana',
    description: 'Un café créé par les tests.',
    latitude: 36.86,
    longitude: 10.19,
    equipment: { wifiSpeed: 25, outletsCount: 5, noiseLevel: 'modere', priceLevel: 1, airConditioning: true },
    openingHours: [
      { weekday: 1, opensAt: '08:00', closesAt: '12:00' },
      { weekday: 1, opensAt: '14:00', closesAt: '19:00' },
    ],
  };

  it('requires a session', async () => {
    await request(app).post('/api/spots').send(validSpot).expect(401);
  });

  it('creates a place with status "a_verifier"', async () => {
    const { agent } = await newLoggedInUser();
    const response = await agent.post('/api/spots').send(validSpot).expect(201);
    expect(response.body).toMatchObject({ name: 'Café du Test', status: 'a_verifier' });
    expect(response.headers.location).toBe(`/api/spots/${response.body.id}`);
    expect(response.body.liveMeter.source).toBe('aucun');
  });

  it('refuses a pin outside Tunisia and overlapping hours', async () => {
    const { agent } = await newLoggedInUser();
    const { body } = await agent
      .post('/api/spots')
      .send({
        ...validSpot,
        latitude: 48.85,
        openingHours: [
          { weekday: 2, opensAt: '08:00', closesAt: '12:00' },
          { weekday: 2, opensAt: '11:00', closesAt: '15:00' },
        ],
      })
      .expect(400);
    const fields = body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['latitude', 'openingHours']));
  });
});
