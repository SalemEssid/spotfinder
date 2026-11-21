import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  inject,
  input,
} from '@angular/core';

/**
 * One form field: label, the control (projected), an optional hint and the error message.
 * Every form of the site uses it, so they all look and behave the same, and accessibility
 * (label ↔ input, hint and error announced by screen readers) is written only once.
 *
 *   <app-form-field label="Adresse e-mail" controlId="login-email" [error]="fieldError(form.controls.email)">
 *     <input appFieldControl class="input" type="email" formControlName="email" />
 *   </app-form-field>
 */
@Component({
  selector: 'app-form-field',
  template: `
    <div class="field">
      <label [for]="controlId()">
        {{ label() }}
        @if (optional()) {
          <span class="text-secondary">(facultatif)</span>
        }
      </label>
      <ng-content />
      @if (hint()) {
        <p class="field__hint" [id]="hintId()">{{ hint() }}</p>
      }
      @if (error(); as message) {
        <p class="field__error" [id]="errorId()">{{ message }}</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  /** id of the control: the label points to it. */
  readonly controlId = input.required<string>();
  readonly hint = input('');
  /** Message to show (usually from fieldError()), null when the value is fine. */
  readonly error = input<string | null>(null);
  readonly optional = input(false);
  /** id of another element that also describes the control (e.g. the password rules list). */
  readonly describedBy = input<string | null>(null);

  readonly hintId = computed(() => `${this.controlId()}-hint`);
  readonly errorId = computed(() => `${this.controlId()}-error`);
  readonly ariaDescribedBy = computed(() => {
    const ids = [
      this.hint() ? this.hintId() : null,
      this.describedBy(),
      this.error() ? this.errorId() : null,
    ];
    return ids.filter(Boolean).join(' ') || null;
  });
}

/**
 * Put on the input / select / textarea inside an <app-form-field>: it receives the field's id,
 * aria-describedby (hint + error) and aria-invalid automatically.
 */
@Directive({
  selector: '[appFieldControl]',
  host: {
    '[id]': 'field.controlId()',
    '[attr.aria-describedby]': 'field.ariaDescribedBy()',
    '[attr.aria-invalid]': 'field.error() ? "true" : null',
  },
})
export class FieldControlDirective {
  protected readonly field = inject(FormFieldComponent);
}

/** Import both at once: `imports: [FORM_FIELD]`. */
export const FORM_FIELD = [FormFieldComponent, FieldControlDirective] as const;
