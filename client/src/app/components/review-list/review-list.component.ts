import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Review } from '../../models/user.model';
import { initials } from '../../utils/format';

/** Community reviews of a place, most recent first. */
@Component({
  selector: 'app-review-list',
  imports: [DatePipe],
  template: `
    <ul class="reviews" role="list">
      @for (review of reviews(); track review.id) {
        <li class="review">
          <span class="review__avatar" aria-hidden="true">{{ initials(review.author.name) }}</span>
          <div class="review__body">
            <p class="review__header">
              <strong>{{ review.author.name }}</strong>
              <time class="caption" [attr.datetime]="review.createdAt">{{ review.createdAt | date: 'd MMMM y' }}</time>
            </p>
            <p class="review__scores">
              Wi-Fi {{ review.ratings.wifi }}/5 · Calme {{ review.ratings.calm }}/5 · Prises
              {{ review.ratings.outlets }}/5 · Prix {{ review.ratings.price }}/5
            </p>
            @if (review.comment) {
              <p class="review__comment">{{ review.comment }}</p>
            }
          </div>
        </li>
      }
    </ul>
  `,
  styles: `
    .reviews {
      display: grid;
      gap: var(--space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .review {
      display: grid;
      grid-template-columns: 40px 1fr;
      gap: var(--space-3);
    }

    .review__avatar {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--calme-bg);
      color: var(--calme-texte);
      font-size: var(--fs-legende);
      font-weight: 700;
    }

    .review__body {
      display: grid;
      gap: 0.2rem;
    }

    .review__header {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--space-2);
    }

    .review__scores {
      font-size: var(--fs-legende);
      color: var(--texte-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewListComponent {
  readonly reviews = input.required<Review[]>();
  protected readonly initials = initials;
}
