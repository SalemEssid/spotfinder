import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Ratings } from '../../models/spot.model';
import { formatRating } from '../../utils/format';

/** "Notes de la communauté": one bar per criterion, value written next to it (mockup Fiche). */
@Component({
  selector: 'app-rating-bars',
  template: `
    <dl class="ratings">
      @for (row of rows(); track row.label) {
        <div class="ratings__row">
          <dt>{{ row.label }}</dt>
          <dd>
            <span class="ratings__bar" aria-hidden="true">
              <span class="ratings__fill" [style.width.%]="row.percent"></span>
            </span>
            <span class="ratings__value">{{ row.text }}</span>
          </dd>
        </div>
      }
    </dl>
  `,
  styles: `
    .ratings {
      display: grid;
      gap: var(--space-3);
      margin: 0;
    }

    .ratings__row {
      display: grid;
      grid-template-columns: 4.5rem 1fr;
      align-items: center;
      gap: var(--space-3);
    }

    dt {
      color: var(--texte-2);
    }

    dd {
      display: grid;
      grid-template-columns: 1fr 3.25rem;
      align-items: center;
      gap: var(--space-3);
      margin: 0;
    }

    .ratings__bar {
      height: 8px;
      border-radius: var(--radius-pill);
      background: var(--neutre-bg);
    }

    .ratings__fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--vert-canard);
      transition: width 600ms var(--ease-out);
    }

    .ratings__value {
      font-weight: 700;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingBarsComponent {
  readonly ratings = input.required<Ratings>();

  protected readonly rows = computed(() => {
    const r = this.ratings();
    return [
      { label: 'Wi-Fi', value: r.wifi },
      { label: 'Calme', value: r.calm },
      { label: 'Prises', value: r.outlets },
      { label: 'Prix', value: r.price },
    ].map(({ label, value }) => ({
      label,
      percent: value === null ? 0 : (value / 5) * 100,
      text: value === null ? '–' : `${formatRating(value)}/5`,
    }));
  });
}
