import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { NewReview } from '../../models/user.model';
import { fieldError } from '../../utils/form-errors';
import { FORM_FIELD } from '../form-field/form-field.component';
import { SpinnerComponent } from '../spinner/spinner.component';
import { StarRatingComponent } from '../star-rating/star-rating.component';

const COMMENT_MAX = 500;

/** "Laisser un avis": one rating per criterion (Wi-Fi, calme, prises, prix) + an optional comment. */
@Component({
  selector: 'app-review-form',
  imports: [ReactiveFormsModule, StarRatingComponent, FORM_FIELD, SpinnerComponent],
  template: `
    <form class="review-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="review-form__stars">
        <app-star-rating formControlName="ratingWifi" label="Wi-Fi" name="rating-wifi" />
        <app-star-rating formControlName="ratingCalm" label="Calme" name="rating-calm" />
        <app-star-rating formControlName="ratingOutlets" label="Prises" name="rating-outlets" />
        <app-star-rating formControlName="ratingPrice" label="Prix" name="rating-price" />
      </div>
      @if (ratingsMissing()) {
        <p class="field__error" role="alert">Donnez une note aux 4 critères.</p>
      }

      <app-form-field
        label="Commentaire"
        controlId="review-comment"
        [optional]="true"
        [hint]="remaining() + ' caractères restants'"
        [error]="commentError()"
      >
        <textarea
          appFieldControl
          class="input"
          formControlName="comment"
          [attr.maxlength]="commentMax"
          placeholder="Ce qui vous a plu, ce qu’il faut savoir avant d’y aller…"
        ></textarea>
      </app-form-field>

      <div class="review-form__actions">
        <button type="submit" class="btn btn--primary" [disabled]="submitting()">
          @if (submitting()) {
            <app-spinner />
          }
          {{ submitting() ? 'Envoi…' : submitLabel() }}
        </button>
        <button type="button" class="btn btn--ghost" (click)="cancelled.emit()">Annuler</button>
      </div>
    </form>
  `,
  styles: `
    .review-form {
      display: grid;
      gap: var(--space-4);
      padding: var(--space-4);
      border: 1px solid var(--bordure);
      border-radius: var(--radius-md);
      background: var(--surface);
    }

    .review-form__stars {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--space-3);
    }

    .review-form__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewFormComponent {
  readonly submitting = input(false);
  /** Existing review to edit: the form starts filled with it. Null = new review. */
  readonly initial = input<NewReview | null>(null);
  readonly submitLabel = input('Publier mon avis');
  readonly submitReview = output<NewReview>();
  readonly cancelled = output<void>();

  protected readonly commentMax = COMMENT_MAX;
  protected readonly form = new FormGroup({
    ratingWifi: new FormControl<number | null>(null, Validators.required),
    ratingCalm: new FormControl<number | null>(null, Validators.required),
    ratingOutlets: new FormControl<number | null>(null, Validators.required),
    ratingPrice: new FormControl<number | null>(null, Validators.required),
    comment: new FormControl('', { nonNullable: true, validators: Validators.maxLength(COMMENT_MAX) }),
  });

  private readonly triedToSubmit = signal(false);
  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly remaining = computed(() => COMMENT_MAX - (this.formValue().comment?.length ?? 0));
  protected readonly ratingsMissing = computed(() => {
    const v = this.formValue();
    return this.triedToSubmit() && [v.ratingWifi, v.ratingCalm, v.ratingOutlets, v.ratingPrice].some((r) => !r);
  });
  protected readonly commentError = computed(() => {
    this.formValue(); // re-evaluate on each change
    return fieldError(this.form.controls.comment);
  });

  constructor() {
    // Editing: fill the form with the existing review (the same form creates and edits).
    effect(() => {
      const review = this.initial();
      if (review) untracked(() => this.form.reset({ ...review }));
    });
  }

  protected submit(): void {
    this.triedToSubmit.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.submitReview.emit({
      ratingWifi: v.ratingWifi!,
      ratingCalm: v.ratingCalm!,
      ratingOutlets: v.ratingOutlets!,
      ratingPrice: v.ratingPrice!,
      comment: v.comment.trim(),
    });
  }
}
