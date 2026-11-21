import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import {
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  type ApplicationConfig,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { sessionExpiredInterceptor } from './interceptors/session-expired.interceptor';
import { AuthService } from './services/auth.service';

// Dates and numbers formatted the French way (13 nov. 2026, 4,5).
registerLocaleData(localeFr);

/**
 * Smooth cross-fade between pages (View Transitions API), except on WebKit browsers
 * (Safari and every browser on iOS). In our end-to-end tests the WebKit engine crashed the page on
 * view transitions; we cannot test a real Safari, so we play safe: those visitors get instant page
 * changes and everything else works the same. (Chrome's and Edge's user agents also say "AppleWebKit".)
 */
const isWebKitEngine =
  typeof navigator !== 'undefined' &&
  /AppleWebKit/.test(navigator.userAgent) &&
  !/Chrome|Chromium|Edg/.test(navigator.userAgent);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(), // route params (/lieux/:id) arrive as component inputs
      // No cross-fade on the very first page: there is nothing to fade from, and it delays the first paint.
      ...(isWebKitEngine ? [] : [withViewTransitions({ skipInitialTransition: true })]), // off with reduced motion (CSS)
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([sessionExpiredInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr' },
    // Restore the session before the first navigation, so guards know who is logged in.
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
};
