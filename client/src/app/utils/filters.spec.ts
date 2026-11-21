import { convertToParamMap } from '@angular/router';
import {
  countActiveFilters,
  describeActiveFilters,
  EMPTY_FILTERS,
  filtersFromParams,
  filtersToParams,
  sameFilters,
} from './filters';

describe('filters ⇄ URL', () => {
  it('reads the example URL from the brief', () => {
    const filters = filtersFromParams(
      convertToParamMap({ bruit: 'silencieux', wifi: '1', prises: '1' }),
    );
    expect(filters).toEqual({
      ...EMPTY_FILTERS,
      noise: ['silencieux'],
      fastWifi: true,
      outlets: true,
    });
  });

  it('writes only active filters, so URLs stay short', () => {
    expect(filtersToParams(EMPTY_FILTERS)).toEqual({});
    expect(
      filtersToParams({ ...EMPTY_FILTERS, q: '  ghazala ', budget: '0', openNow: true }),
    ).toEqual({
      q: 'ghazala',
      budget: '0',
      ouvert: '1',
    });
  });

  it('survives a round trip (share a link, refresh the page)', () => {
    const original = {
      q: 'café',
      noise: ['silencieux', 'modere'] as const,
      fastWifi: true,
      outlets: false,
      airConditioning: true,
      budget: '6' as const,
      openNow: true,
    };
    const params = filtersToParams({ ...original, noise: [...original.noise] });
    expect(filtersFromParams(convertToParamMap(params))).toEqual({
      ...original,
      noise: [...original.noise],
    });
  });

  it('ignores invalid values from a hand-edited URL instead of breaking', () => {
    const filters = filtersFromParams(
      convertToParamMap({ bruit: 'silencieux,assourdissant', budget: '1000', wifi: 'oui' }),
    );
    expect(filters).toEqual({ ...EMPTY_FILTERS, noise: ['silencieux'] });
  });
});

describe('filter helpers', () => {
  it('counts active filters (text search excluded)', () => {
    expect(
      countActiveFilters({
        ...EMPTY_FILTERS,
        q: 'x',
        noise: ['anime'],
        outlets: true,
        budget: '3',
      }),
    ).toBe(3);
  });

  it('compares filters by meaning, not by object identity', () => {
    expect(sameFilters({ ...EMPTY_FILTERS }, { ...EMPTY_FILTERS, q: '  ' })).toBe(true);
    expect(sameFilters(EMPTY_FILTERS, { ...EMPTY_FILTERS, fastWifi: true })).toBe(false);
  });

  it('describes each filter with a way to remove it ("Essayez sans le filtre « Prises »")', () => {
    const active = describeActiveFilters({ ...EMPTY_FILTERS, outlets: true, openNow: true });
    expect(active.map((a) => a.label)).toEqual(['Sans « Prises »', 'Sans « Ouvert maintenant »']);
    expect(active[0]!.hint).toBe('le filtre « Prises »');
    expect(active[0]!.without).toEqual({ ...EMPTY_FILTERS, openNow: true });
  });

  it('suggests removing the text search last (it is the most specific)', () => {
    const active = describeActiveFilters({ ...EMPTY_FILTERS, q: 'zzzz', outlets: true });
    expect(active.at(-1)).toEqual({
      label: 'Sans la recherche',
      hint: 'la recherche « zzzz »',
      without: { ...EMPTY_FILTERS, outlets: true },
    });
  });
});
