import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * If a protected call answers 401 while we think we are logged in, the session expired
 * (or the cookie was deleted): update the UI so it shows "Connexion" again.
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  return next(request).pipe(
    catchError((error: unknown) => {
      const isSessionCheck = request.url.startsWith('/api/auth/');
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isSessionCheck &&
        auth.isLoggedIn()
      ) {
        auth.clearSession();
      }
      return throwError(() => error);
    }),
  );
};
