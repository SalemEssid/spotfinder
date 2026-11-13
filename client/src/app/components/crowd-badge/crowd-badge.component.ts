import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideClock } from '@lucide/angular';
import type { LiveMeter } from '../../models/spot.model';
import { crowdBadgeText } from '../../utils/live-meter';

/** "≈ 30 % · Calme": the colour always comes with the word (style guide rule). */
@Component({
  selector: 'app-crowd-badge',
  imports: [LucideClock],
  template: `
    <span [class]="badgeClass()" [attr.title]="tooltip()">
      @if (meter().source === 'habituel') {
        <svg lucideClock aria-hidden="true"></svg>
      }
      {{ text() }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrowdBadgeComponent {
  readonly meter = input.required<LiveMeter>();

  protected readonly text = computed(() => crowdBadgeText(this.meter()));
  protected readonly badgeClass = computed(() => {
    const level = this.meter().level;
    return level ? `badge badge--${level}` : 'badge';
  });
  protected readonly tooltip = computed(() => {
    switch (this.meter().source) {
      case 'live':
        return 'Affluence estimée d’après les signalements récents';
      case 'habituel':
        return 'Aucun signalement récent : affluence habituelle à cette heure';
      default:
        return 'Personne n’a encore signalé l’affluence ici';
    }
  });
}
