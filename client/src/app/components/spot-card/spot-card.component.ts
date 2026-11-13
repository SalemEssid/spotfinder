import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideHourglass } from '@lucide/angular';
import type { SpotSummary } from '../../models/spot.model';
import { formatDistance, formatRating, formatTime, SPOT_TYPE_LABELS, wifiLabel } from '../../utils/format';
import { REFERENCE_POINT } from '../../utils/reference-point';
import { CrowdBadgeComponent } from '../crowd-badge/crowd-badge.component';
import { SpotIllustrationComponent } from '../spot-illustration/spot-illustration.component';

/**
 * A place in a list (Explorer) or a grid (Accueil, Favoris). The whole card is clickable,
 * but only the title is a link, so screen readers announce just the place name.
 */
@Component({
  selector: 'app-spot-card',
  imports: [RouterLink, CrowdBadgeComponent, SpotIllustrationComponent, LucideHourglass],
  templateUrl: './spot-card.component.html',
  styleUrl: './spot-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-grid]': 'layout() === "grid"',
    '[class.is-highlighted]': 'highlighted()',
  },
})
export class SpotCardComponent {
  readonly spot = input.required<SpotSummary>();
  readonly layout = input<'list' | 'grid'>('list');
  readonly highlighted = input(false);
  /** Hover / keyboard focus, so the Explorer can highlight the matching pin (null = left). */
  readonly highlight = output<number | null>();

  protected readonly typeLabel = computed(() => SPOT_TYPE_LABELS[this.spot().type]);

  protected readonly distanceText = computed(() => {
    const meters = this.spot().distanceMeters;
    return meters === null ? null : `${formatDistance(meters)} de ${REFERENCE_POINT.label}`;
  });

  protected readonly openingText = computed(() => {
    const { openNow, closesAt } = this.spot();
    if (!openNow) return 'Fermé';
    return closesAt ? `Ouvert jusqu’à ${formatTime(closesAt)}` : 'Ouvert';
  });

  /** Two equipment badges next to the crowd badge, as in the mockup: Wi-Fi and prises. */
  protected readonly badges = computed(() => {
    const { equipment, ratings } = this.spot();
    const wifi =
      ratings.wifi !== null ? `Wi-Fi ${formatRating(Math.round(ratings.wifi))}/5` : wifiLabel(equipment.wifiSpeed);
    return [wifi, `Prises : ${equipment.outletsCount > 0 ? 'oui' : 'non'}`];
  });
}
