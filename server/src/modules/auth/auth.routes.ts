import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env';
import { HttpError } from '../../utils/http-error';
import { loginSchema, registerSchema } from './auth.schemas';
import { login, register } from './auth.service';
import { SESSION_COOKIE, sessionCookieOptions, signSessionToken } from './token';
import { findUserById, type User } from './users.repository';

export const authRouter = Router();

/**
 * Slows down password guessing: 20 attempts per IP every 15 minutes in production.
 * Higher in development, where the end-to-end tests log in many times from the same machine.
 */
const authAttemptsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProduction ? 20 : 500,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, _res, next) =>
    next(
      new HttpError(
        429,
        'TOO_MANY_ATTEMPTS',
        'Trop de tentatives. Réessayez dans quelques minutes.',
      ),
    ),
});

/** The user as sent to the browser: never the password hash. */
export const toUserDto = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
});

function openSession(res: Response, user: User): void {
  res.cookie(SESSION_COOKIE, signSessionToken(user), sessionCookieOptions);
}

authRouter.post('/register', authAttemptsLimiter, async (req, res) => {
  const input = registerSchema.parse(req.body);
  const user = await register(input);
  openSession(res, user); // signing up also logs you in
  res.status(201).json(toUserDto(user));
});

authRouter.post('/login', authAttemptsLimiter, async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await login(input);
  openSession(res, user);
  res.json(toUserDto(user));
});

authRouter.post('/logout', (_req, res) => {
  const { maxAge: _maxAge, ...cookieOptions } = sessionCookieOptions;
  res.clearCookie(SESSION_COOKIE, cookieOptions);
  res.status(204).end();
});

/**
 * Lets the Angular app restore the session after a page refresh.
 * "Not logged in" is a normal answer here, not an error: 200 with `user: null`
 * (a 401 would be logged as an error in the browser console on every visit).
 */
authRouter.get('/me', async (req, res) => {
  const user = req.user ? await findUserById(req.user.id) : null;
  res.json({ user: user ? toUserDto(user) : null });
});
