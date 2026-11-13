export interface ErrorDetail {
  field: string;
  message: string;
}

/**
 * An error that already knows its HTTP status. Throw it anywhere in a route,
 * service or repository and the error handler turns it into the JSON error format:
 * `{ "error": { "code", "message", "details"? } }`.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ErrorDetail[];
  /** Extra machine-readable data, e.g. `retryAfterSeconds` for 429. */
  readonly meta?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    options: { details?: ErrorDetail[]; meta?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = options.details;
    this.meta = options.meta;
  }
}

export const notFound = (message = 'Ressource introuvable.') =>
  new HttpError(404, 'NOT_FOUND', message);

export const unauthorized = (message = 'Connectez-vous pour continuer.') =>
  new HttpError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'Action non autorisée.') =>
  new HttpError(403, 'FORBIDDEN', message);
