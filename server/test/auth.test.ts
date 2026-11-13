import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, newLoggedInUser } from './helpers';

describe('Auth API', () => {
  it('registers, opens a session and returns the user without its password', async () => {
    const { agent, email } = await newLoggedInUser('Nouvelle Membre');

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user).toMatchObject({ name: 'Nouvelle Membre', email, role: 'user' });
    expect(me.body.user).not.toHaveProperty('password_hash');
    expect(me.body.user).not.toHaveProperty('passwordHash');
  });

  it('sets an httpOnly SameSite cookie', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@spotfinder.tn', password: 'SpotFinder2026' })
      .expect(200);
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toContain('sf_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('rejects a duplicate e-mail with 409', async () => {
    const { email } = await newLoggedInUser();
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Autre', email: email.toUpperCase(), password: 'Motdepasse1' })
      .expect(409);
    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('validates the sign-up form and explains every invalid field', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'pas-un-email', password: 'court' })
      .expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    const fields = response.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('answers 401 with the same message for a wrong password or an unknown e-mail', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@spotfinder.tn', password: 'mauvais' })
      .expect(401);
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'personne@spotfinder.tn', password: 'mauvais' })
      .expect(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it('logs out by clearing the cookie', async () => {
    const { agent } = await newLoggedInUser();
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(200, { user: null });
  });

  it('ignores a forged session cookie', async () => {
    await request(app).get('/api/auth/me').set('Cookie', 'sf_session=not-a-real-token').expect(200, { user: null });
    await request(app).get('/api/me').set('Cookie', 'sf_session=not-a-real-token').expect(401);
  });
});
