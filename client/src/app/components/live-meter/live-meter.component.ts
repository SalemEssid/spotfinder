import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import type { LiveMeter } from '../../models/spot.model';
import { ClockService } from '../../services/clock.service';
import { formatRelativeTime } from '../../utils/format';
import { LEVEL_LABELS, MODERE_FROM_PERCENT, SATURE_FROM_PERCENT } from '../../utils/live-meter';

const ANIMATION_MS = 700;

/**
 * The Live Meter ("Jauge d'affluence" in the style guide): our signature feature.
 * - "≈ 47 % · Modéré": the colour is always paired with the word.
 * - The source is always visible ("3 signalements · il y a 10 min") so users know how far to trust it.
 * - When the value changes, the number counts to its new value and the card pulses once.
 */
@Component({
  selector: 'app-live-meter',
  templateUrl: './live-meter.component.html',
  styleUrl: './live-meter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveMeterComponent {
  readonly meter = input.required<LiveMeter>();

  private readonly clock = inject(ClockService);
  /** The number on screen: follows `meter().occupancy` with a short count-up animation. */
  protected readonly displayed = signal<number | null>(null);
  protected readonly justUpdated = signal(false);
  protected readonly thresholds = { modere: MODERE_FROM_PERCENT, sature: SATURE_FROM_PERCENT };

  protected readonly levelLabel = computed(() => {
    const level = this.meter().level;
    return level ? LEVEL_LABELS[level] : '';
  });

  protected readonly title = computed(() => {
    switch (this.meter().source) {
      case 'live':
        return 'Affluence maintenant';
      case 'habituel':
        return 'Affluence habituelle à cette heure';
      default:
        return 'Affluence';
    }
  });

  /** Always say where the number comes from. */
  protected readonly sourceText = computed(() => {
    const meter = this.meter();
    const now = this.clock.now();
    if (meter.source === 'live' && meter.lastReportAt) {
      const count = meter.reportCount === 1 ? '1 signalement' : `${meter.reportCount} signalements`;
      return `${count} · ${formatRelativeTime(meter.lastReportAt, now)}`;
    }
    if (meter.source === 'habituel') {
      const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Africa/Tunis' }).format(now);
      const hour = new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', timeZone: 'Africa/Tunis' }).format(now);
      return `Estimation habituelle · ${meter.reportCount} signalements passés le ${weekday} vers ${hour}`;
    }
    return 'Soyez le premier à indiquer l’affluence ici.';
  });

  protected readonly confidenceText = computed(() => {
    switch (this.meter().confidence) {
      case 'faible':
        return 'Fiabilité faible : peu de signalements récents';
      case 'moyenne':
        return 'Fiabilité moyenne';
      case 'bonne':
        return 'Fiabilité bonne : plusieurs signalements récents';
      default:
        return null;
    }
  });

  protected readonly valueText = computed(() => {
    const { occupancy } = this.meter();
    return occupancy === null ? 'Pas de donnée' : `environ ${occupancy} %, ${this.levelLabel()}`;
  });

  constructor() {
    let frame = 0;
    let pulseTimer: ReturnType<typeof setTimeout> | undefined;
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(frame);
      clearTimeout(pulseTimer);
    });

    effect(() => {
      const target = this.meter().occupancy;
      const start = untracked(this.displayed);
      cancelAnimationFrame(frame);

      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
      if (start === null || target === null || start === target || reduceMotion) {
        this.displayed.set(target);
      } else {
        // Count from the old value to the new one, easing out.
        const startedAt = performance.now();
        const step = (time: number) => {
          const progress = Math.min(1, (time - startedAt) / ANIMATION_MS);
          const eased = 1 - (1 - progress) ** 3;
          this.displayed.set(Math.round(start + (target - start) * eased));
          if (progress < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      }

      // Pulse the card once when an existing value changes (not on first display).
      if (start !== null && start !== target) {
        this.justUpdated.set(false);
        queueMicrotask(() => this.justUpdated.set(true));
        clearTimeout(pulseTimer);
        pulseTimer = setTimeout(() => this.justUpdated.set(false), 1200);
      }
    });
  }
}
