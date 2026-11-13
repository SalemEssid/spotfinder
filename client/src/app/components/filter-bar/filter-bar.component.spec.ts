import { TestBed } from '@angular/core/testing';
import { EMPTY_FILTERS, type SpotFilters } from '../../utils/filters';
import { FilterBarComponent, SEARCH_DEBOUNCE_MS } from './filter-bar.component';

async function render(filters: SpotFilters = EMPTY_FILTERS) {
  TestBed.configureTestingModule({ imports: [FilterBarComponent] });
  const fixture = TestBed.createComponent(FilterBarComponent);
  fixture.componentRef.setInput('filters', filters);
  const emitted: SpotFilters[] = [];
  fixture.componentInstance.filtersChange.subscribe((value) => emitted.push(value));
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    [...element.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
  return { fixture, element, emitted, button };
}

describe('FilterBarComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('emits the new filters when a chip is clicked (no waiting)', async () => {
    const { emitted, button } = await render();
    button('Silencieux').click();
    button('Wi-Fi rapide').click();
    expect(emitted[0]).toEqual({ ...EMPTY_FILTERS, noise: ['silencieux'] });
    expect(emitted[1]).toEqual({ ...EMPTY_FILTERS, fastWifi: true });
  });

  it('shows which filters are active with aria-pressed', async () => {
    const { button } = await render({ ...EMPTY_FILTERS, outlets: true, noise: ['modere'] });
    expect(button('Prises').getAttribute('aria-pressed')).toBe('true');
    expect(button('Modéré').getAttribute('aria-pressed')).toBe('true');
    expect(button('Silencieux').getAttribute('aria-pressed')).toBe('false');
  });

  it('removes a noise level that was already selected', async () => {
    const { emitted, button } = await render({ ...EMPTY_FILTERS, noise: ['silencieux', 'modere'] });
    button('Silencieux').click();
    expect(emitted[0]!.noise).toEqual(['modere']);
  });

  it('waits for a pause in typing before searching (debounce)', async () => {
    const { element, emitted } = await render();
    vi.useFakeTimers(); // after rendering: Angular's whenStable() needs the real clock
    const input = element.querySelector<HTMLInputElement>('input[type="search"]')!;

    for (const value of ['g', 'gh', 'gha', 'ghazala']) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(100); // typing fast: less than the debounce delay between keys
    }
    expect(emitted).toEqual([]);

    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(emitted).toEqual([{ ...EMPTY_FILTERS, q: 'ghazala' }]); // one search, not four
  });

  it('emits the budget picked in the list', async () => {
    const { element, emitted } = await render();
    const select = element.querySelector<HTMLSelectElement>('#budget-filter')!;
    select.value = '3';
    select.dispatchEvent(new Event('change'));
    expect(emitted[0]!.budget).toBe('3');
  });

  it('offers "Réinitialiser" only when something is active, and clears everything', async () => {
    const empty = await render();
    expect(empty.element.textContent).not.toContain('Réinitialiser');

    TestBed.resetTestingModule();
    const active = await render({ ...EMPTY_FILTERS, q: 'café', openNow: true });
    active.button('Réinitialiser').click();
    expect(active.emitted[0]).toEqual(EMPTY_FILTERS);
  });
});
