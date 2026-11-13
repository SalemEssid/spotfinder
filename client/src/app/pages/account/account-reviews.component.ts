import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideTrash } from '@lucide/angular';
import { catchError, of } from 'rxjs';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import type { Review } from '../../models/user.model';
import { AccountService } from '../../services/account.service';
import { ToastService } from '../../services/toast.service';
import { apiErrorMessage } from '../../utils/api-error';

@Component({
  selector: 'app-account-reviews',
  imports: [RouterLink, DatePipe, EmptyStateComponent, LucideTrash],
  template: `
    <section class="my-reviews" aria-labelledby="my-reviews-title">
      <h2 id="my-reviews-title">Mes avis</h2>

      @if (error()) {
        <app-empty-state tone="error" title="Vos avis n’ont pas pu être chargés" [message]="error()!" />
      } @else if (reviews(); as list) {
        @if (list.length === 0) {
          <app-empty-state
            title="Vous n’avez pas encore donné d’avis"
            message="Vos notes aident les autres à choisir : Wi-Fi, calme, prises et prix."
          >
            <a class="btn btn--primary" routerLink="/explorer">Trouver un lieu à noter</a>
          </app-empty-state>
        } @else {
          <ul class="list" role="list">
            @for (review of list; track review.id) {
              <li class="card review">
                <div class="review__header">
                  <h3><a [routerLink]="['/lieux', review.spot.id]">{{ review.spot.name }}</a></h3>
                  <time class="caption" [attr.datetime]="review.createdAt">{{ review.createdAt | date: 'd MMMM y' }}</time>
                </div>
                <p class="caption">
                  Wi-Fi {{ review.ratings.wifi }}/5 · Calme {{ review.ratings.calm }}/5 · Prises
                  {{ review.ratings.outlets }}/5 · Prix {{ review.ratings.price }}/5
                </p>
                @if (review.comment) {
                  <p>{{ review.comment }}</p>
                }

                <!-- Two-step delete: no accidental loss. -->
                @if (confirmingId() === review.id) {
                  <div class="confirm" role="group" aria-label="Confirmer la suppression">
                    <span>Supprimer cet avis ?</span>
                    <button type="button" class="btn btn--danger" (click)="remove(review)">Oui, supprimer</button>
                    <button type="button" class="btn btn--ghost" (click)="confirmingId.set(null)">Annuler</button>
                  </div>
                } @else {
                  <button type="button" class="btn btn--ghost delete" (click)="confirmingId.set(review.id)">
                    <svg lucideTrash aria-hidden="true"></svg>
                    Supprimer<span class="visually-hidden"> l’avis sur {{ review.spot.name }}</span>
                  </button>
                }
              </li>
            }
          </ul>
        }
      } @else {
        <div class="skeleton" style="height: 140px"></div>
      }
    </section>
  `,
  styles: `
    .my-reviews {
      display: grid;
      gap: var(--space-4);
      max-width: 760px;
    }

    .list {
      display: grid;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .review {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-4);
    }

    .review__header {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-2);

      a {
        color: var(--encre);
      }
    }

    .delete {
      justify-self: start;
      color: var(--danger);
    }

    .confirm {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      font-weight: 500;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountReviewsComponent {
  private readonly account = inject(AccountService);
  private readonly toast = inject(ToastService);

  protected readonly reviews = signal<Review[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmingId = signal<number | null>(null);

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

  protected remove(review: Review): void {
    this.confirmingId.set(null);
    this.account.deleteReview(review.id).subscribe({
      next: () => {
        this.reviews.update((list) => list?.filter((r) => r.id !== review.id) ?? null);
        this.toast.success('Avis supprimé.');
      },
      error: (error: unknown) => this.toast.error(apiErrorMessage(error, 'Impossible de supprimer cet avis.')),
    });
  }
}
