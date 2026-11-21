import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideClock,
  LucideSearch,
  LucideSlidersHorizontal,
  LucideUsers,
} from '@lucide/angular';
import { catchError, of } from 'rxjs';
import { SpotCardComponent } from '../../components/spot-card/spot-card.component';
import type { SpotSummary } from '../../models/spot.model';
import { SpotService } from '../../services/spot.service';
import { EMPTY_FILTERS, filtersToParams } from '../../utils/filters';
import { REFERENCE_POINT } from '../../utils/reference-point';

/** Quick filters of the mockup. Each one maps to an Explorer filter. */
const QUICK_FILTERS = [
  { id: 'calme', label: 'Silencieux' },
  { id: 'wifi', label: 'Wi-Fi rapide' },
  { id: 'prises', label: 'Prises' },
  { id: 'ouvert', label: 'Ouvert maintenant' },
] as const;
type QuickFilterId = (typeof QUICK_FILTERS)[number]['id'];

@Component({
  selector: 'app-home',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    SpotCardComponent,
    LucideSearch,
    LucideArrowRight,
    LucideSlidersHorizontal,
    LucideUsers,
    LucideClock,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly router = inject(Router);

  protected readonly referenceLabel = REFERENCE_POINT.label;
  protected readonly quickFilters = QUICK_FILTERS;
  protected readonly query = new FormControl('', { nonNullable: true });
  /** "Silencieux" pre-selected, as in the mockup: the most common need. */
  protected readonly selected = signal<ReadonlySet<QuickFilterId>>(new Set(['calme']));

  protected readonly spots = signal<SpotSummary[] | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly nearby = computed(() =>
    (this.spots() ?? []).filter((s) => s.status === 'publie').slice(0, 3),
  );

  /** "27 signalements ces 2 dernières heures, dans 11 lieux": proof that the data is alive. */
  protected readonly liveSummary = computed(() => {
    const live = (this.spots() ?? []).filter((s) => s.liveMeter.source === 'live');
    if (live.length === 0) return null;
    const reports = live.reduce((sum, s) => sum + s.liveMeter.reportCount, 0);
    return `${reports} signalement${reports > 1 ? 's' : ''} ces 2 dernières heures, dans ${live.length} lieu${live.length > 1 ? 'x' : ''}`;
  });

  constructor() {
    inject(SpotService)
      .list(EMPTY_FILTERS)
      .pipe(
        catchError(() => {
          this.loadFailed.set(true);
          return of([]);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((spots) => this.spots.set(spots));
  }

  protected toggle(id: QuickFilterId): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Journey 1: Accueil → search or filter → Explorer with the matching places (2 clicks). */
  protected search(event: Event): void {
    event.preventDefault();
    const selected = this.selected();
    const queryParams = filtersToParams({
      ...EMPTY_FILTERS,
      q: this.query.value,
      noise: selected.has('calme') ? ['silencieux'] : [],
      fastWifi: selected.has('wifi'),
      outlets: selected.has('prises'),
      openNow: selected.has('ouvert'),
    });
    void this.router.navigate(['/explorer'], { queryParams });
  }
}
