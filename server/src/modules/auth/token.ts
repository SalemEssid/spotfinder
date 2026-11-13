import type { CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export interface AuthUser {
  id: number;
  role: 'user' | 'admin';
}

export const SESSION_COOKIE = 'sf_session';
const SESSION_LIFETIME_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Why a JWT in an httpOnly cookie?
 * - httpOnly: JavaScript (and therefore an XSS attack) cannot read the token.
 * - SameSite=Lax: the browser does not send it with cross-site POST requests (CSRF protection).
 * - The Angular dev proxy makes the API same-origin, so the cookie "just works" without CORS tricks.
 * - A JWT is stateless: the server checks the signature, no session table is needed.
 */
export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProduction, // HTTPS only in production
  maxAge: SESSION_LIFETIME_SECONDS * 1000,
  path: '/',
};

export function signSessionToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: SESSION_LIFETIME_SECONDS,
    algorithm: 'HS256',
  });
}

/** Returns the user encoded in the token, or null if it is invalid or expired. */
export function verifySessionToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || !payload.sub) return null;
    return { id: Number(payload.sub), role: payload['role'] === 'admin' ? 'admin' : 'user' };
  } catch {
    return null;
  }
}
