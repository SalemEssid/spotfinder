import { HttpErrorResponse } from '@angular/common/http';
import type { AbstractControl, FormGroup } from '@angular/forms';
import type { ApiErrorBody } from '../models/user.model';

function body(error: unknown): ApiErrorBody['error'] | null {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object' && 'error' in error.error) {
    return (error.error as ApiErrorBody).error;
  }
  return null;
}

/** A message the user can read, whatever went wrong. */
export function apiErrorMessage(error: unknown, fallback = 'Une erreur est survenue. Réessayez.'): string {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
  }
  return body(error)?.message ?? fallback;
}

export function apiErrorCode(error: unknown): string | null {
  return body(error)?.code ?? null;
}

export function apiErrorBody(error: unknown): ApiErrorBody['error'] | null {
  return body(error);
}

/**
 * Shows server-side validation errors next to the matching form fields
 * (the server validates too: the client checks are only a convenience).
 * Returns true if at least one field error was applied.
 */
export function applyServerErrors(form: FormGroup, error: unknown): boolean {
  let applied = false;
  for (const detail of body(error)?.details ?? []) {
    const control: AbstractControl | null = form.get(detail.field);
    if (control) {
      control.setErrors({ ...control.errors, server: detail.message });
      control.markAsTouched();
      applied = true;
    }
  }
  return applied;
}
