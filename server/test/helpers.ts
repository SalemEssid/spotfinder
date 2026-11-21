import request from 'supertest';
import { afterAll } from 'vitest';
import { createApp } from '../src/app';
import { pool } from '../src/db/pool';

export const app = createApp();

afterAll(async () => {
  await pool.end();
});

/** Creates a brand-new account and returns an agent that keeps its session cookie. */
export async function newLoggedInUser(name = 'Testeur') {
  const agent = request.agent(app);
  const email = `test-${crypto.randomUUID()}@example.tn`;
  const response = await agent
    .post('/api/auth/register')
    .send({ name, email, password: 'Motdepasse1' })
    .expect(201);
  return { agent, email, user: response.body as { id: number; name: string } };
}

/** Creates a fresh place (no reports, no reviews) so a test does not depend on others. */
export async function newSpot(agent: ReturnType<typeof request.agent>): Promise<number> {
  const response = await agent
    .post('/api/spots')
    .send({
      name: `Lieu de test ${Date.now()}`,
      type: 'autre',
      address: '1 rue des Tests, Ariana',
      area: 'Ariana',
      latitude: 36.86,
      longitude: 10.19,
      equipment: {
        wifiSpeed: 10,
        outletsCount: 2,
        noiseLevel: 'modere',
        priceLevel: 0,
        airConditioning: false,
      },
      openingHours: [],
    })
    .expect(201);
  return response.body.id;
}

/** Id of a seeded place, looked up by name. */
export async function seededSpotId(name: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>('SELECT id FROM spots WHERE name = $1', [name]);
  if (!rows[0]) throw new Error(`Seed place not found: ${name}`);
  return rows[0].id;
}
