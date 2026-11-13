import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { getLiveMeter } from '../src/modules/live-reports/live-meter.service';
import { app, newLoggedInUser, newSpot, seededSpotId } from './helpers';

describe('Live Meter API', () => {
  it('GET /live returns a live estimate for a place with recent reports', async () => {
    const id = await seededSpotId('Salon de thé Nour');
    const { body } = await request(app).get(`/api/spots/${id}/live`).expect(200);
    expect(body).toMatchObject({ source: 'live', level: 'sature' });
    expect(body.reportCount).toBeGreaterThan(0);
    expect(body.occupancy).toBeGreaterThanOrEqual(70);
  });

  it('says "aucun" for a place without any report', async () => {
    const pending = await seededSpotId('Café Panorama Ghazala');
    const { body } = await request(app).get(`/api/spots/${pending}/live`).expect(200);
    expect(body).toMatchObject({ source: 'aucun', occupancy: null, level: null });
  });

  it('falls back to the historical average for the same weekday and hour ("habituel")', async () => {
    // Café L'Encrier has weeks of history (open 06:30–23:00 every day) but no recent report.
    // Asked "at 15:00 Tunis today", it must answer with the usual occupancy at that hour.
    const id = await seededSpotId('Café L’Encrier');
    const today15hTunis = new Date();
    today15hTunis.setUTCHours(14, 0, 0, 0); // 14:00 UTC = 15:00 in Tunis (UTC+1)
    const meter = await getLiveMeter(id, today15hTunis);
    expect(meter.source).toBe('habituel');
    expect(meter.reportCount).toBeGreaterThanOrEqual(3);
    expect([25, 55, 85].some((v) => Math.abs(v - meter.occupancy!) <= 30)).toBe(true);
    expect(meter.lastReportAt).toBeNull();
  });

  it('requires a session to report', async () => {
    const id = await seededSpotId('Café Le Pupitre');
    await request(app).post(`/api/spots/${id}/live-reports`).send({ level: 'calme' }).expect(401);
  });

  it('stores a report, returns the updated meter, then rate-limits the same user', async () => {
    const { agent } = await newLoggedInUser();
    const id = await newSpot(agent); // a place with no data at all

    const first = await agent.post(`/api/spots/${id}/live-reports`).send({ level: 'sature' }).expect(201);
    expect(first.body.liveMeter).toMatchObject({ source: 'live', occupancy: 85, level: 'sature', reportCount: 1 });
    expect(first.body.liveMeter.totalWeight).toBeCloseTo(1, 2);

    const second = await agent.post(`/api/spots/${id}/live-reports`).send({ level: 'calme' }).expect(429);
    expect(second.body.error.code).toBe('REPORT_TOO_SOON');
    expect(second.body.error.retryAfterSeconds).toBeGreaterThan(14 * 60);
    expect(second.headers['retry-after']).toBeDefined();

    // Another user can still report right away.
    const other = await newLoggedInUser();
    const third = await other.agent.post(`/api/spots/${id}/live-reports`).send({ level: 'calme' }).expect(201);
    expect(third.body.liveMeter.reportCount).toBe(2);
    expect(third.body.liveMeter.occupancy).toBe(55); // (85 + 25) / 2 with two fresh reports
  });

  it('handles a double click: only one of two simultaneous reports is accepted', async () => {
    const id = await seededSpotId('Café des Arts');
    const { agent } = await newLoggedInUser();
    const statuses = await Promise.all([
      agent.post(`/api/spots/${id}/live-reports`).send({ level: 'moyen' }),
      agent.post(`/api/spots/${id}/live-reports`).send({ level: 'moyen' }),
    ]).then((responses) => responses.map((r) => r.status).sort());
    expect(statuses).toEqual([201, 429]);
  });

  it('validates the level and the place', async () => {
    const { agent } = await newLoggedInUser();
    const id = await seededSpotId('Café Le Pupitre');
    await agent.post(`/api/spots/${id}/live-reports`).send({ level: 'bondé' }).expect(400);
    await agent.post('/api/spots/99999/live-reports').send({ level: 'calme' }).expect(404);
  });

  it('GET /live/hourly returns the typical day profile', async () => {
    const id = await seededSpotId('Café Le Pupitre');
    const { body } = await request(app).get(`/api/spots/${id}/live/hourly`).expect(200);
    expect(body.hours.length).toBeGreaterThan(5);
    expect(body.hours[0]).toHaveProperty('occupancy');
  });
});
