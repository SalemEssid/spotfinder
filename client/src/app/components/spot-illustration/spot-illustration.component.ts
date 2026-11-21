import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SpotType } from '../../models/spot.model';

/**
 * The "desk + lamp" illustration of our mockups, drawn in SVG (a few hundred bytes, no photo).
 * One small object on the desk changes with the type of place.
 */
@Component({
  selector: 'app-spot-illustration',
  template: `
    <svg viewBox="0 0 120 90" aria-hidden="true" focusable="false">
      <!-- lamp light: the orange dot of the mockups -->
      <circle class="accent" cx="94" cy="24" r="7" />
      <!-- desk -->
      <rect class="ink" x="20" y="57" width="80" height="6" rx="3" />
      <rect class="ink" x="28" y="62" width="5" height="21" rx="2" />
      <rect class="ink" x="87" y="62" width="5" height="21" rx="2" />
      @switch (type()) {
        @case ('bibliotheque') {
          <rect class="ink" x="36" y="45" width="30" height="5" rx="1.5" />
          <rect class="ink-soft" x="39" y="39" width="26" height="6" rx="1.5" />
          <rect class="ink" x="35" y="50" width="34" height="7" rx="1.5" />
          <rect class="ink-soft" x="74" y="34" width="6" height="23" rx="1.5" />
          <rect class="ink" x="81" y="38" width="6" height="19" rx="1.5" />
        }
        @case ('salon_de_the') {
          <ellipse class="ink" cx="55" cy="49" rx="14" ry="9" />
          <rect class="ink" x="51" y="36" width="8" height="5" rx="2" />
          <path class="ink" d="M68 46l9-6 2 3-8 7z" />
          <path class="ink-soft" d="M40 45c-5 0-6 8 0 8" fill="none" stroke-width="3" />
          <rect class="ink-soft" x="78" y="49" width="8" height="8" rx="2" />
        }
        @case ('coworking') {
          <rect class="ink" x="34" y="36" width="30" height="18" rx="3" />
          <rect class="ink" x="30" y="53" width="38" height="4" rx="2" />
          <rect class="ink-soft" x="76" y="47" width="10" height="10" rx="2" />
          <path
            class="leaf"
            d="M81 47c-6-4-6-11-2-14 2 5 3 9 2 14zm0 0c4-6 9-7 11-4-4 3-7 4-11 4z"
          />
        }
        @default {
          <!-- café and others: laptop + cup -->
          <rect class="ink" x="38" y="36" width="32" height="18" rx="3" />
          <rect class="ink" x="34" y="53" width="40" height="4" rx="2" />
          @if (type() === 'cafe') {
            <path class="ink-soft" d="M79 45h11v7a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
            <path class="ink-soft" d="M90 47h2a3 3 0 0 1 0 6h-2" fill="none" stroke-width="2.5" />
          }
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: grid;
      place-items: center;
      overflow: hidden;
      background: var(--illustration-bg);
    }

    svg {
      width: 100%;
      height: 100%;
      max-height: 100%;
    }

    .ink {
      fill: var(--vert-canard);
    }

    .ink-soft {
      fill: var(--calme-texte);
      stroke: var(--calme-texte);
      stroke-width: 0;
    }

    .accent {
      fill: var(--orange);
    }

    .leaf {
      fill: #3f9a7d;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpotIllustrationComponent {
  readonly type = input<SpotType>('cafe');
}
