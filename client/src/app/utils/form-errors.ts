import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Default French message for each Angular validator. */
const DEFAULT_MESSAGES: Record<string, (error: unknown) => string> = {
  required: () => 'Ce champ est obligatoire.',
  email: () => 'Adresse e-mail invalide.',
  minlength: (e) => `Au moins ${(e as { requiredLength: number }).requiredLength} caractères.`,
  maxlength: (e) => `${(e as { requiredLength: number }).requiredLength} caractères maximum.`,
  min: (e) => `Valeur minimale : ${(e as { min: number }).min}.`,
  max: (e) => `Valeur maximale : ${(e as { max: number }).max}.`,
  pattern: () => 'Format invalide.',
  server: (message) => String(message), // set by applyServerErrors()
};

/**
 * The message to show under a field, or null. Shown only once the user has interacted with
 * the field (or tried to submit), so a fresh form is not covered in red.
 */
export function fieldError(control: AbstractControl | null, custom: Record<string, string> = {}): string | null {
  if (!control?.errors || !(control.touched || control.dirty)) return null;
  const [key, value] = Object.entries(control.errors)[0]!;
  return custom[key] ?? DEFAULT_MESSAGES[key]?.(value) ?? 'Valeur invalide.';
}

/** Password rules, same as the server (8+ characters, at least one letter and one digit). */
export const PASSWORD_RULES = [
  { id: 'length', label: '8 caractères minimum', test: (v: string) => v.length >= 8 },
  { id: 'letter', label: 'au moins une lettre', test: (v: string) => /[A-Za-z]/.test(v) },
  { id: 'digit', label: 'au moins un chiffre', test: (v: string) => /\d/.test(v) },
] as const;

export const passwordValidator: ValidatorFn = (control): ValidationErrors | null => {
  const value = String(control.value ?? '');
  return PASSWORD_RULES.every((rule) => rule.test(value)) ? null : { password: true };
};

/** Cross-field validator for the group: both passwords must be identical. */
export const passwordsMatchValidator: ValidatorFn = (group): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return confirm && password !== confirm ? { passwordsMismatch: true } : null;
};

/** Only accept internal paths as redirect targets ("/compte"), never another site ("//evil.com"). */
export function safeRedirect(target: string | null | undefined, fallback = '/compte'): string {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : fallback;
}
