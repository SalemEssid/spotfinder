import type { Request, RequestHandler } from 'express';
import { SESSION_COOKIE, verifySessionToken, type AuthUser } from '../modules/auth/token';
import { unauthorized } from '../utils/http-error';

/** Reads the session cookie on every request and sets `req.user` when it is valid. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string') {
    const user = verifySessionToken(token);
    if (user) req.user = user;
  }
  next();
};

/** Route guard: 401 when nobody is logged in. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) throw unauthorized();
  next();
};

/** The logged-in user, for handlers placed behind `requireAuth`. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
