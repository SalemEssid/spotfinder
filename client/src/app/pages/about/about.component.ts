import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideCircleCheck,
  LucideClock,
  LucideSend,
  LucideShieldCheck,
  LucideUsers,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { FORM_FIELD } from '../../components/form-field/form-field.component';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { AccountService } from '../../services/account.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { apiErrorMessage, applyServerErrors } from '../../utils/api-error';
import { fieldError } from '../../utils/form-errors';

const MESSAGE_MAX = 2000;

@Component({
  selector: 'app-about',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FORM_FIELD,
    SpinnerComponent,
    LucideSend,
    LucideCircleCheck,
    LucideUsers,
    LucideClock,
    LucideShieldCheck,
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  private readonly account = inject(AccountService);
  private readonly toast = inject(ToastService);
  private readonly user = inject(AuthService).user();

  protected readonly messageMax = MESSAGE_MAX;
  protected readonly form = new FormGroup({
    // Pre-filled when logged in: one less thing to type.
    name: new FormControl(this.user?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(60)],
    }),
    email: new FormControl(this.user?.email ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(MESSAGE_MAX),
      ],
    }),
  });
  protected readonly fieldError = fieldError;
  protected readonly sending = signal(false);
  /** After sending, the form is replaced by a thank-you message with the sender's name. */
  protected readonly sentBy = signal<string | null>(null);

  private readonly message = toSignal(this.form.controls.message.valueChanges, {
    initialValue: '',
  });
  protected readonly remaining = computed(() => MESSAGE_MAX - this.message().length);

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.sending()) return;
    this.sending.set(true);
    const value = this.form.getRawValue();
    this.account
      .sendContactMessage({
        name: value.name.trim(),
        email: value.email.trim(),
        message: value.message.trim(),
      })
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: () => {
          this.sentBy.set(value.name.trim());
          this.toast.success('Message envoyé. Merci !');
        },
        error: (error: unknown) => {
          applyServerErrors(this.form, error);
          this.toast.error(apiErrorMessage(error, 'Votre message n’a pas pu être envoyé.'));
        },
      });
  }

  protected writeAnother(): void {
    this.form.controls.message.reset('');
    this.sentBy.set(null);
  }
}
