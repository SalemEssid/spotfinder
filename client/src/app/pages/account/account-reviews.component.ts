import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucidePencil, LucideTrash } from '@lucide/angular';
import { catchError, finalize, of } from 'rxjs';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { ReviewFormComponent } from '../../components/review-form/review-form.component';
import type { NewReview, Review } from '../../models/user.model';
import { AccountService } from '../../services/account.service';
import { ToastService } from '../../services/toast.service';
import { apiErrorMessage } from '../../utils/api-error';

/** "Mes avis": read, edit (same form as on the place page) and delete one's own reviews. */
@Component({
  selector: 'app-account-reviews',
  imports: [
    RouterLink,
    DatePipe,
    EmptyStateComponent,
    ReviewFormComponent,
    LucidePencil,
    LucideTrash,
  ],
  templateUrl: './account-reviews.component.html',
  styleUrl: './account-reviews.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountReviewsComponent {
  private readonly account = inject(AccountService);
  private readonly toast = inject(ToastService);

  protected readonly reviews = signal<Review[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmingId = signal<number | null>(null);
  /** The review being edited, with its values captured once (the form is filled from them). */
  protected readonly editing = signal<{ id: number; initial: NewReview } | null>(null);
  protected readonly saving = signal(false);

  constructor() {
    this.account
      .myReviews()
      .pipe(
        catchError((error: unknown) => {
          this.error.set(apiErrorMessage(error));
          return of(null);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((list) => this.reviews.set(list));
  }

  protected startEditing(review: Review): void {
    this.confirmingId.set(null);
    this.editing.set({
      id: review.id,
      initial: {
        ratingWifi: review.ratings.wifi,
        ratingCalm: review.ratings.calm,
        ratingOutlets: review.ratings.outlets,
        ratingPrice: review.ratings.price,
        comment: review.comment,
      },
    });
  }

  protected save(review: Review, changes: NewReview): void {
    this.saving.set(true);
    this.account
      .updateReview(review.id, changes)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => {
          this.reviews.update(
            (list) => list?.map((r) => (r.id === updated.id ? updated : r)) ?? null,
          );
          this.editing.set(null);
          this.toast.success('Avis modifié.');
        },
        error: (error: unknown) =>
          this.toast.error(apiErrorMessage(error, 'Impossible de modifier cet avis.')),
      });
  }

  protected remove(review: Review): void {
    this.confirmingId.set(null);
    this.account.deleteReview(review.id).subscribe({
      next: () => {
        this.reviews.update((list) => list?.filter((r) => r.id !== review.id) ?? null);
        this.toast.success('Avis supprimé.');
      },
      error: (error: unknown) =>
        this.toast.error(apiErrorMessage(error, 'Impossible de supprimer cet avis.')),
    });
  }
}
