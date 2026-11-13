import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Pages that need an account (/compte, /ajouter). Not logged in → login page, then back here.
 * The session was restored at startup (provideAppInitializer), so the signal is already accurate.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/connexion'], { queryParams: { redirect: state.url } });
};

/** Login / sign-up pages make no sense once logged in. */
export const guestGuard: CanActivateFn = () => {
  if (!inject(AuthService).isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/compte']);
};
