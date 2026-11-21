import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, newLoggedInUser, seededSpotId } from './helpers';

const review = {
  ratingWifi: 4,
  ratingCalm: 5,
  ratingOutlets: 3,
  ratingPrice: 4,
  comment: 'Très bien pour réviser.',
};

describe('Reviews API', () => {
  it('lists the reviews of a place', async () => {
    const id = await seededSpotId('Café Le Pupitre');
    const { body } = await request(app).get(`/api/spots/${id}/reviews`).expect(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('author.name');
  });

  it('creates a review once per user and place', async () => {
    const id = await seededSpotId('Le Hub du Lac');
    const { agent } = await newLoggedInUser('Critique');
    const created = await agent.post(`/api/spots/${id}/reviews`).send(review).expect(201);
    expect(created.body).toMatchObject({
      author: { name: 'Critique' },
      ratings: { wifi: 4, calm: 5 },
    });

    const again = await agent.post(`/api/spots/${id}/reviews`).send(review).expect(409);
    expect(again.body.error.code).toBe('ALREADY_REVIEWED');
  });

  it('validates ratings between 1 and 5', async () => {
    const id = await seededSpotId('Le Hub du Lac');
    const { agent } = await newLoggedInUser();
    const { body } = await agent
      .post(`/api/spots/${id}/reviews`)
      .send({ ...review, ratingWifi: 6, ratingCalm: 0 })
      .expect(400);
    expect(body.error.details.map((d: { field: string }) => d.field)).toEqual([
      'ratingWifi',
      'ratingCalm',
    ]);
  });

  it('lets the author edit a review, and marks it as edited', async () => {
    const id = await seededSpotId('Café des Arts');
    const author = await newLoggedInUser('Auteur');
    const created = await author.agent.post(`/api/spots/${id}/reviews`).send(review).expect(201);
    expect(created.body.updatedAt).toBeNull();

    const edited = await author.agent
      .put(`/api/reviews/${created.body.id}`)
      .send({ ...review, ratingCalm: 2, comment: '  Plus bruyant que prévu.  ' })
      .expect(200);
    expect(edited.body).toMatchObject({
      ratings: { calm: 2, wifi: 4 },
      comment: 'Plus bruyant que prévu.',
    });
    expect(edited.body.updatedAt).not.toBeNull();
  });

  it('refuses to edit someone else’s review, an invalid one, or one that does not exist', async () => {
    const id = await seededSpotId('Café Les Pages');
    const author = await newLoggedInUser();
    const created = await author.agent.post(`/api/spots/${id}/reviews`).send(review).expect(201);

    const stranger = await newLoggedInUser();
    await stranger.agent.put(`/api/reviews/${created.body.id}`).send(review).expect(403);
    await author.agent
      .put(`/api/reviews/${created.body.id}`)
      .send({ ...review, ratingPrice: 9 })
      .expect(400);
    await author.agent.put('/api/reviews/99999').send(review).expect(404);
    await request(app).put(`/api/reviews/${created.body.id}`).send(review).expect(401);
  });

  it('lets only the author delete a review', async () => {
    const id = await seededSpotId('Café L’Encrier');
    const author = await newLoggedInUser();
    const created = await author.agent.post(`/api/spots/${id}/reviews`).send(review).expect(201);

    const stranger = await newLoggedInUser();
    await stranger.agent.delete(`/api/reviews/${created.body.id}`).expect(403);
    await author.agent.delete(`/api/reviews/${created.body.id}`).expect(204);
    await author.agent.delete(`/api/reviews/${created.body.id}`).expect(404);
  });
});

describe('Espace membre API (/api/me)', () => {
  it('requires a session', async () => {
    await request(app).get('/api/me').expect(401);
    await request(app).get('/api/me/favorites').expect(401);
  });

  it('adds, lists and removes favourites (idempotent)', async () => {
    const id = await seededSpotId('Bibliothèque municipale');
    const { agent } = await newLoggedInUser();

    await agent.put(`/api/me/favorites/${id}`).expect(204);
    await agent.put(`/api/me/favorites/${id}`).expect(204); // twice is fine
    const list = await agent.get('/api/me/favorites').expect(200);
    expect(list.body.map((s: { id: number }) => s.id)).toEqual([id]);

    const detail = await agent.get(`/api/spots/${id}`).expect(200);
    expect(detail.body.isFavorite).toBe(true);

    await agent.delete(`/api/me/favorites/${id}`).expect(204);
    expect((await agent.get('/api/me/favorites').expect(200)).body).toEqual([]);
  });

  it('returns the profile with activity counters and updates the name', async () => {
    const { agent } = await newLoggedInUser('Avant');
    const profile = await agent.get('/api/me').expect(200);
    expect(profile.body.stats).toEqual({
      reviewCount: 0,
      reportCount: 0,
      favoriteCount: 0,
      spotCount: 0,
    });

    const updated = await agent.patch('/api/me').send({ name: '  Après  ' }).expect(200);
    expect(updated.body.name).toBe('Après');
  });

  it('shows the demo account’s seeded activity', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'demo@spotfinder.tn', password: 'SpotFinder2026' })
      .expect(200);
    expect((await agent.get('/api/me/favorites').expect(200)).body).toHaveLength(3);
    expect((await agent.get('/api/me/reviews').expect(200)).body).toHaveLength(2);
  });
});

describe('Contact API', () => {
  it('stores a valid message', async () => {
    const { body } = await request(app)
      .post('/api/contact')
      .send({ name: 'Sami', email: 'sami@example.tn', message: 'Bonjour, super projet !' })
      .expect(201);
    expect(body.id).toBeTypeOf('number');
  });

  it('rejects a too short message', async () => {
    const { body } = await request(app)
      .post('/api/contact')
      .send({ name: 'Sami', email: 'sami@example.tn', message: 'Salut' })
      .expect(400);
    expect(body.error.details[0].field).toBe('message');
  });
});

describe('API basics', () => {
  it('health check', async () => {
    await request(app).get('/api/health').expect(200, { status: 'ok' });
  });

  it('404 in the standard error format for an unknown route', async () => {
    const { body } = await request(app).get('/api/nope').expect(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('400 for malformed JSON', async () => {
    const { body } = await request(app)
      .post('/api/contact')
      .set('Content-Type', 'application/json')
      .send('{"name": ')
      .expect(400);
    expect(body.error.code).toBe('INVALID_JSON');
  });
});
