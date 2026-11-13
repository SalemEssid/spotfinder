import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideCircleExclamationPoint,
  LucideEye,
  LucideEyeOff,
  LucideHeart,
  LucideMapPinPlus,
  LucideUsers,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { SpotIllustrationComponent } from '../../components/spot-illustration/spot-illustration.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { apiErrorMessage } from '../../utils/api-error';
import { fieldError, safeRedirect } from '../../utils/form-errors';

/** Demo account created by the seed (also documented in the README). */
export const DEMO_ACCOUNT = { email: 'demo@spotfinder.tn', password: 'SpotFinder2026' };

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    SpotIllustrationComponent,
    LucideEye,
    LucideEyeOff,
    LucideCircleExclamationPoint,
    LucideUsers,
    LucideHeart,
    LucideMapPinPlus,
  ],
  templateUrl: './login.component.html',
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  /** ?redirect=/lieux/3: where to go after logging in. */
  readonly redirect = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly demo = DEMO_ACCOUNT;
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly fieldError = fieldError;

  protected fillDemo(): void {
    this.form.setValue({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password });
    this.serverError.set(null);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.serverError.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth
      .login(email, password)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (user) => {
          this.toast.success(`Bonjour ${user.name} !`);
          void this.router.navigateByUrl(safeRedirect(this.redirect()));
        },
        error: (error: unknown) => this.serverError.set(apiErrorMessage(error, 'Connexion impossible. Réessayez.')),
      });
  }
}
