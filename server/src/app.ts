import { existsSync } from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { z } from 'zod';
import { env } from './config/env';
import { pool } from './db/pool';
import { optionalAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { authRouter } from './modules/auth/auth.routes';
import { contactRouter } from './modules/contact/contact.routes';
import { liveReportsRouter } from './modules/live-reports/live-reports.routes';
import { meRouter } from './modules/me/me.routes';
import { reviewsRouter, spotReviewsRouter } from './modules/reviews/reviews.routes';
import { spotsRouter } from './modules/spots/spots.routes';

// Default validation messages in French (custom messages in the schemas take precedence).
z.config(z.locales.fr());

/** Built Angular app, served by Express in production (`npm run build` then `npm start`). */
const CLIENT_DIST = path.resolve(import.meta.dirname, '../../client/dist/client/browser');

/**
 * Angular puts a content hash in every built file name (main-FQJ7GIVH.js): such a file never
 * changes, so the browser may keep it for a year. Other files (index.html, robots.txt…) are
 * revalidated on every visit, so a new version of the site is picked up immediately.
 */
const HASHED_FILE = /-[A-Za-z0-9_]{8}\.(js|css|woff2|png|svg)$/;
function cacheHeaders(res: express.Response, filePath: string): void {
  res.setHeader(
    'Cache-Control',
    HASHED_FILE.test(path.basename(filePath)) ? 'public, max-age=31536000, immutable' : 'no-cache',
  );
}

/** In production Express serves the client itself, so the client's origin is the site's origin. */
const SERVED_OVER_HTTPS = env.CLIENT_ORIGIN.startsWith('https://');

/** Builds the Express app without starting it, so tests can call it with Supertest. */
export function createApp() {
  const app = express();

  app.use(
    helmet({
      // Leaflet loads map tiles from openstreetmap.org: the only third party allowed by the CSP.
      // ('unsafe-inline' styles: Angular and Leaflet set inline style attributes.)
      contentSecurityPolicy: {
        directives: {
          'img-src': [
            "'self'",
            'data:',
            'https://tile.openstreetmap.org',
            'https://*.tile.openstreetmap.org',
          ],
          'style-src': ["'self'", "'unsafe-inline'"],
          // helmet adds this by default. Over plain HTTP (npm run preview, a school server) Safari
          // also applies it to localhost and rewrites our own scripts to https://, which do not
          // exist: the page stays blank. So we only send it when the site is served over HTTPS.
          'upgrade-insecure-requests': SERVED_OVER_HTTPS ? [] : null,
        },
      },
    }),
  );
  // In development the Angular proxy makes every call same-origin, so CORS is never needed.
  // This only protects the API if someone calls it directly from another site.
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  // gzip every text response (JSON, HTML, JS, CSS): the main bundle goes from ~450 kB to ~95 kB.
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (env.NODE_ENV === 'development') app.use(morgan('dev'));
  app.use(optionalAuth);

  const api = Router();
  api.get('/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  });
  api.use('/auth', authRouter);
  api.use('/spots', spotsRouter);
  api.use('/spots/:id', liveReportsRouter);
  api.use('/spots/:id/reviews', spotReviewsRouter);
  api.use('/reviews', reviewsRouter);
  api.use('/me', meRouter);
  api.use('/contact', contactRouter);
  api.use(notFoundHandler);
  app.use('/api', api);

  if (existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST, { index: false, setHeaders: cacheHeaders }));
    // Angular routes (/explorer, /lieux/3…) all serve index.html; the client router takes over.
    app.get('/{*path}', (_req, res) =>
      res.sendFile(path.join(CLIENT_DIST, 'index.html'), {
        headers: { 'Cache-Control': 'no-cache' },
      }),
    );
  }

  app.use(errorHandler);
  return app;
}
