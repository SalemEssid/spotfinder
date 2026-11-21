import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideCheck,
  LucideCircleExclamationPoint,
  LucideEye,
  LucideEyeOff,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { FORM_FIELD } from '../../components/form-field/form-field.component';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { apiErrorMessage, applyServerErrors } from '../../utils/api-error';
import {
  fieldError,
  PASSWORD_RULES,
  passwordsMatchValidator,
  passwordValidator,
  safeRedirect,
} from '../../utils/form-errors';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FORM_FIELD,
    SpinnerComponent,
    LucideCheck,
    LucideEye,
    LucideEyeOff,
    LucideCircleExclamationPoint,
  ],
  templateUrl: './register.component.html',
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  readonly redirect = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly form = new FormGroup(
    {
      name: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2), Validators.maxLength(60)],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, passwordValidator],
      }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: Validators.required }),
    },
    { validators: passwordsMatchValidator },
  );
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly fieldError = fieldError;

  private readonly password = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });
  /** Live checklist under the password field: each rule turns green when met. */
  protected readonly rules = computed(() =>
    PASSWORD_RULES.map((rule) => ({ label: rule.label, ok: rule.test(this.password()) })),
  );

  protected confirmError(): string | null {
    const confirm = this.form.controls.confirmPassword;
    if (!confirm.touched) return null;
    if (confirm.hasError('required')) return 'Confirmez votre mot de passe.';
    return this.form.hasError('passwordsMismatch')
      ? 'Les deux mots de passe ne sont pas identiques.'
      : null;
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.serverError.set(null);

    const { name, email, password } = this.form.getRawValue();
    this.auth
      .register(name.trim(), email, password)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (user) => {
          this.toast.success(`Bienvenue ${user.name} ! Votre compte est prêt.`);
          void this.router.navigateByUrl(safeRedirect(this.redirect()));
        },
        error: (error: unknown) => {
          // "Cette adresse est déjà utilisée." goes under the e-mail field.
          if (!applyServerErrors(this.form, error)) {
            this.serverError.set(apiErrorMessage(error, 'Inscription impossible. Réessayez.'));
          }
        },
      });
  }
}
