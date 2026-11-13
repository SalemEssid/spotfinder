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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(), // route params (/lieux/:id) arrive as component inputs
      withViewTransitions(), // smooth cross-fade between pages (skipped with reduced motion)
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([sessionExpiredInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr' },
    // Restore the session before the first navigation, so guards know who is logged in.
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
};
