import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideLogOut, LucideMapPinPlus, LucidePencil } from '@lucide/angular';
import { catchError, finalize, of } from 'rxjs';
import type { Profile } from '../../models/user.model';
import { AccountService } from '../../services/account.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { apiErrorMessage } from '../../utils/api-error';
import { fieldError } from '../../utils/form-errors';

@Component({
  selector: 'app-account-profile',
  imports: [ReactiveFormsModule, RouterLink, LucideLogOut, LucidePencil, LucideMapPinPlus],
  templateUrl: './account-profile.component.html',
  styleUrl: './account-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfileComponent {
  private readonly account = inject(AccountService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly profile = signal<Profile | null>(null);
  protected readonly loadError = signal(false);
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(60)],
  });
  protected readonly fieldError = fieldError;

  constructor() {
    this.account
      .profile()
      .pipe(
        catchError(() => {
          this.loadError.set(true);
          return of(null);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((profile) => this.profile.set(profile));
  }

  protected startEditing(): void {
    this.nameControl.setValue(this.profile()?.name ?? '');
    this.editing.set(true);
  }

  protected saveName(event: Event): void {
    event.preventDefault();
    this.nameControl.markAsTouched();
    if (this.nameControl.invalid || this.saving()) return;
    this.saving.set(true);
    this.account
      .updateName(this.nameControl.value.trim())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (user) => {
          this.auth.updateLocalUser(user);
          this.profile.update((p) => (p ? { ...p, name: user.name } : p));
          this.editing.set(false);
          this.toast.success('Nom mis à jour.');
        },
        error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
      });
  }

  protected logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.toast.info('Vous êtes déconnecté. À bientôt !');
        void this.router.navigate(['/']);
      },
      error: (error: unknown) => this.toast.error(apiErrorMessage(error)),
    });
  }
}
