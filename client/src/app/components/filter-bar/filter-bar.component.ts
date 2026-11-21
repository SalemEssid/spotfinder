import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  LucideClock,
  LucidePlug,
  LucideRotateCcw,
  LucideSearch,
  LucideSnowflake,
  LucideWifi,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import type { NoiseLevel } from '../../models/spot.model';
import {
  BUDGET_LABELS,
  countActiveFilters,
  EMPTY_FILTERS,
  NOISE_LABELS,
  type SpotFilters,
} from '../../utils/filters';

/** Waiting time after the last key stroke before searching (avoids one request per letter). */
export const SEARCH_DEBOUNCE_MS = 300;

type ToggleFilter = 'fastWifi' | 'outlets' | 'airConditioning' | 'openNow';

/**
 * Search field + filter chips. It does not store the filters itself: it receives them (`filters`)
 * and emits the new value (`filtersChange`). The Explorer writes them into the URL.
 */
@Component({
  selector: 'app-filter-bar',
  imports: [
    ReactiveFormsModule,
    LucideSearch,
    LucideWifi,
    LucidePlug,
    LucideSnowflake,
    LucideClock,
    LucideRotateCcw,
  ],
  templateUrl: './filter-bar.component.html',
  styleUrl: './filter-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'focusSearchOnSlash($event)' },
})
export class FilterBarComponent {
  readonly filters = input.required<SpotFilters>();
  readonly filtersChange = output<SpotFilters>();

  protected readonly search = new FormControl('', { nonNullable: true });
  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly noiseOptions = (Object.keys(NOISE_LABELS) as NoiseLevel[]).map((value) => ({
    value,
    label: NOISE_LABELS[value],
  }));
  protected readonly budgetOptions = (Object.keys(BUDGET_LABELS) as ('0' | '3' | '6')[]).map(
    (value) => ({
      value,
      label: BUDGET_LABELS[value],
    }),
  );
  protected readonly canReset = computed(
    () => countActiveFilters(this.filters()) > 0 || this.filters().q !== '',
  );

  constructor() {
    // Keep the field in sync when the filters change from outside (URL, "Réinitialiser"…).
    effect(() => {
      const q = this.filters().q;
      if (q !== this.search.value.trim()) this.search.setValue(q, { emitEvent: false });
    });

    // Typing: wait for a pause, then search. RxJS makes "debounce" a one-liner.
    this.search.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((value) => value.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((q) => {
        if (q !== this.filters().q) this.emit({ q });
      });
  }

  /** Enter in the field: search right away, without waiting for the debounce. */
  protected submitSearch(event: Event): void {
    event.preventDefault();
    const q = this.search.value.trim();
    if (q !== this.filters().q) this.emit({ q });
  }

  protected isNoiseActive(level: NoiseLevel): boolean {
    return this.filters().noise.includes(level);
  }

  protected toggleNoise(level: NoiseLevel): void {
    const noise = this.filters().noise;
    this.emit({
      noise: noise.includes(level) ? noise.filter((n) => n !== level) : [...noise, level],
    });
  }

  protected toggle(key: ToggleFilter): void {
    this.emit({ [key]: !this.filters()[key] });
  }

  protected onBudgetChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.emit({ budget: value === '0' || value === '3' || value === '6' ? value : null });
  }

  protected reset(): void {
    this.search.setValue('', { emitEvent: false });
    this.filtersChange.emit(EMPTY_FILTERS);
  }

  /** Keyboard shortcut: "/" focuses the search field (like on many search sites). */
  protected focusSearchOnSlash(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing = target?.closest('input, textarea, select, [contenteditable="true"]');
    if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.searchInput().nativeElement.focus();
    }
  }

  private emit(patch: Partial<SpotFilters>): void {
    this.filtersChange.emit({ ...this.filters(), q: this.search.value.trim(), ...patch });
  }
}
