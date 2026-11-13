import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideList, LucideMap, LucideX } from '@lucide/angular';
import { catchError, distinctUntilChanged, map, merge, of, Subject, switchMap, tap } from 'rxjs';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { FilterBarComponent } from '../../components/filter-bar/filter-bar.component';
import { MapViewComponent } from '../../components/map-view/map-view.component';
import { SpotCardComponent } from '../../components/spot-card/spot-card.component';
import type { SpotSummary } from '../../models/spot.model';
import { SpotService } from '../../services/spot.service';
import { apiErrorMessage } from '../../utils/api-error';
import {
  describeActiveFilters,
  filtersFromParams,
  filtersToParams,
  sameFilters,
  type SpotFilters,
} from '../../utils/filters';
import { REFERENCE_POINT } from '../../utils/reference-point';

/**
 * Explorer: list + map + filters.
 *
 * Data flow (one direction only):
 *   URL query params → filters signal → API request → spots signal → list and map
 * The FilterBar never changes the list directly: it changes the URL, and everything follows.
 * That is why a filtered search can be shared and survives a refresh.
 */
@Component({
  selector: 'app-explorer',
  imports: [
    RouterLink,
    FilterBarComponent,
    SpotCardComponent,
    MapViewComponent,
    EmptyStateComponent,
    LucideList,
    LucideMap,
    LucideX,
  ],
  templateUrl: './explorer.component.html',
  styleUrl: './explorer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly spotService = inject(SpotService);

  protected readonly filters = toSignal(this.route.queryParamMap.pipe(map(filtersFromParams)), {
    requireSync: true,
  });
  protected readonly spots = signal<SpotSummary[] | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Card hovered in the list or pin hovered on the map: both sides highlight it. */
  protected readonly highlightedId = signal<number | null>(null);
  /** Phones show either the list or the map. */
  protected readonly mobileView = signal<'list' | 'map'>('list');
  /** Phones, map view: place shown in the preview card after tapping a pin. */
  protected readonly previewId = signal<number | null>(null);

  protected readonly referenceLabel = REFERENCE_POINT.label;
  protected readonly skeletons = [1, 2, 3, 4];
  protected readonly filtersToParams = filtersToParams;
  protected readonly preview = computed(() => this.spots()?.find((s) => s.id === this.previewId()) ?? null);
  /** "Essayez sans le filtre « Prises »": the last two active filters, most recent first. */
  protected readonly suggestions = computed(() => describeActiveFilters(this.filters()).slice(-2).reverse());
  protected readonly resultText = computed(() => {
    const count = this.spots()?.length ?? 0;
    return count === 0 ? 'Aucun lieu trouvé' : count === 1 ? '1 lieu trouvé' : `${count} lieux trouvés`;
  });

  private readonly retry$ = new Subject<void>();

  constructor() {
    const filterChanges$ = toObservable(this.filters).pipe(distinctUntilChanged(sameFilters));
    const retries$ = this.retry$.pipe(map(() => this.filters()));

    merge(filterChanges$, retries$)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        // switchMap: if the filters change again before the answer arrives, the old request is
        // cancelled, so a slow old answer can never overwrite a newer one.
        switchMap((filters) =>
          this.spotService.list(filters).pipe(
            map((spots) => ({ spots, error: null })),
            catchError((error: unknown) =>
              of({ spots: null, error: apiErrorMessage(error, 'Impossible de charger les lieux.') }),
            ),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ spots, error }) => {
        this.loading.set(false);
        this.error.set(error);
        if (spots) this.spots.set(spots);
        this.previewId.set(null);
      });
  }

  protected onFiltersChange(filters: SpotFilters): void {
    // replaceUrl: each chip click does not add a browser-history entry ("Back" leaves the Explorer).
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtersToParams(filters),
      replaceUrl: true,
    });
  }

  protected retry(): void {
    this.retry$.next();
  }

  protected onMarkerSelect(id: number): void {
    this.highlightedId.set(id);
    if (this.mobileView() === 'map' && window.matchMedia('(max-width: 767px)').matches) {
      this.previewId.set(id);
      return;
    }
    // Desktop: bring the matching card into view.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById(`spot-${id}`)
      ?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  protected showOnMobile(view: 'list' | 'map'): void {
    this.mobileView.set(view);
    this.previewId.set(null);
  }
}
