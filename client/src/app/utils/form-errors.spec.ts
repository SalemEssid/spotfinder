import { FormControl, FormGroup, Validators } from '@angular/forms';
import { fieldError, passwordsMatchValidator, passwordValidator, safeRedirect } from './form-errors';

describe('fieldError', () => {
  it('stays silent until the user touched the field', () => {
    const control = new FormControl('', Validators.required);
    expect(fieldError(control)).toBeNull();
    control.markAsTouched();
    expect(fieldError(control)).toBe('Ce champ est obligatoire.');
  });

  it('shows the server message first when there is one', () => {
    const control = new FormControl('demo@spotfinder.tn');
    control.setErrors({ server: 'Cette adresse est déjà utilisée.' });
    control.markAsTouched();
    expect(fieldError(control)).toBe('Cette adresse est déjà utilisée.');
  });
});

describe('password validators', () => {
  it('requires 8 characters, a letter and a digit (same rules as the API)', () => {
    expect(passwordValidator(new FormControl('court1'))).toEqual({ password: true });
    expect(passwordValidator(new FormControl('sanschiffre'))).toEqual({ password: true });
    expect(passwordValidator(new FormControl('Motdepasse1'))).toBeNull();
  });

  it('checks that both passwords match', () => {
    const group = new FormGroup({ password: new FormControl('Motdepasse1'), confirmPassword: new FormControl('Autre1234') });
    expect(passwordsMatchValidator(group)).toEqual({ passwordsMismatch: true });
    group.controls.confirmPassword.setValue('Motdepasse1');
    expect(passwordsMatchValidator(group)).toBeNull();
  });
});

describe('safeRedirect', () => {
  it('accepts internal paths only', () => {
    expect(safeRedirect('/lieux/3?signaler=1')).toBe('/lieux/3?signaler=1');
    expect(safeRedirect('//evil.example.com')).toBe('/compte');
    expect(safeRedirect('https://evil.example.com')).toBe('/compte');
    expect(safeRedirect(undefined)).toBe('/compte');
  });
});
