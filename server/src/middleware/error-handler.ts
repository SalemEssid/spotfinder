import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http-error';

/** 404 for any /api route that no router handled. */
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, 'NOT_FOUND', 'Cette route n’existe pas.'));
};

/**
 * Single place where errors become HTTP responses.
 * Express 5 forwards errors thrown in async handlers here automatically,
 * so routes never need their own try/catch.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    const retryAfter = error.meta?.['retryAfterSeconds'];
    if (typeof retryAfter === 'number') res.setHeader('Retry-After', String(retryAfter));
    res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details, ...error.meta },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Certains champs sont invalides.',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  // Malformed JSON body (thrown by express.json()).
  if (isBodyParserError(error)) {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Le corps de la requête est invalide.' } });
    return;
  }

  // PostgreSQL unique_violation: a constraint caught a duplicate we did not check for.
  if (isPgError(error) && error.code === '23505') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'Cette ressource existe déjà.' } });
    return;
  }

  console.error(error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Une erreur inattendue est survenue.' } });
};

function isBodyParserError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.parse.failed';
}

function isPgError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string';
}
