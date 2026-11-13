import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../config/env';
import { pool } from '../../db/pool';
import { HttpError } from '../../utils/http-error';
import { emailSchema, nameSchema } from '../auth/auth.schemas';

export const contactRouter = Router();

const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  message: z
    .string()
    .trim()
    .min(10, 'Votre message doit contenir au moins 10 caractères.')
    .max(2000, '2000 caractères maximum.'),
});

/** Anti-spam: 5 messages per IP per hour. */
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, _res, next) =>
    next(new HttpError(429, 'TOO_MANY_MESSAGES', 'Vous avez envoyé beaucoup de messages. Réessayez plus tard.')),
});

/** POST /api/contact — stored in the database (no e-mail is sent). */
contactRouter.post('/', contactLimiter, async (req, res) => {
  const input = contactSchema.parse(req.body);
  const { rows } = await pool.query<{ id: number; created_at: Date }>(
    'INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3) RETURNING id, created_at',
    [input.name, input.email, input.message],
  );
  res.status(201).json({ id: rows[0]!.id, createdAt: rows[0]!.created_at.toISOString() });
});
