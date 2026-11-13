import type { ParamMap, Params } from '@angular/router';
import type { NoiseLevel } from '../models/spot.model';

/**
 * Explorer filters. The URL is their single source of truth:
 *   /explorer?q=ghazala&bruit=silencieux,modere&wifi=1&prises=1&budget=3&ouvert=1
 * so a filtered search can be shared and survives a refresh.
 */
export interface SpotFilters {
  q: string;
  noise: NoiseLevel[];
  fastWifi: boolean;
  outlets: boolean;
  airConditioning: boolean;
  /** Max price in DT: '0' = free only. null = any budget. */
  budget: '0' | '3' | '6' | null;
  openNow: boolean;
}

export const EMPTY_FILTERS: SpotFilters = {
  q: '',
  noise: [],
  fastWifi: false,
  outlets: false,
  airConditioning: false,
  budget: null,
  openNow: false,
};

const NOISE_LEVELS: readonly NoiseLevel[] = ['silencieux', 'modere', 'anime'];
const BUDGETS = ['0', '3', '6'] as const;

/** Reads filters from the URL, ignoring anything invalid (a hand-edited URL never breaks the page). */
export function filtersFromParams(params: ParamMap): SpotFilters {
  const noise = (params.get('bruit') ?? '')
    .split(',')
    .filter((value): value is NoiseLevel => NOISE_LEVELS.includes(value as NoiseLevel));
  const budget = params.get('budget');
  return {
    q: (params.get('q') ?? '').trim().slice(0, 80),
    noise: [...new Set(noise)],
    fastWifi: params.get('wifi') === '1',
    outlets: params.get('prises') === '1',
    airConditioning: params.get('clim') === '1',
    budget: BUDGETS.find((b) => b === budget) ?? null,
    openNow: params.get('ouvert') === '1',
  };
}

/** Filters → URL query params. Inactive filters are left out, so the URL stays short. */
export function filtersToParams(filters: SpotFilters): Params {
  const params: Params = {};
  if (filters.q.trim()) params['q'] = filters.q.trim();
  if (filters.noise.length) params['bruit'] = filters.noise.join(',');
  if (filters.fastWifi) params['wifi'] = '1';
  if (filters.outlets) params['prises'] = '1';
  if (filters.airConditioning) params['clim'] = '1';
  if (filters.budget !== null) params['budget'] = filters.budget;
  if (filters.openNow) params['ouvert'] = '1';
  return params;
}

/** Number of active filters, the text search excluded. */
export function countActiveFilters(filters: SpotFilters): number {
  return (
    filters.noise.length +
    Number(filters.fastWifi) +
    Number(filters.outlets) +
    Number(filters.airConditioning) +
    Number(filters.budget !== null) +
    Number(filters.openNow)
  );
}

export function sameFilters(a: SpotFilters, b: SpotFilters): boolean {
  return JSON.stringify(filtersToParams(a)) === JSON.stringify(filtersToParams(b));
}

/** Human name of each removable filter, for "Essayez sans le filtre « Prises »". */
export interface ActiveFilter {
  label: string;
  without: SpotFilters;
}

export function describeActiveFilters(filters: SpotFilters): ActiveFilter[] {
  const active: ActiveFilter[] = [];
  for (const level of filters.noise) {
    active.push({ label: NOISE_LABELS[level], without: { ...filters, noise: filters.noise.filter((n) => n !== level) } });
  }
  if (filters.fastWifi) active.push({ label: 'Wi-Fi rapide', without: { ...filters, fastWifi: false } });
  if (filters.outlets) active.push({ label: 'Prises', without: { ...filters, outlets: false } });
  if (filters.airConditioning) active.push({ label: 'Clim', without: { ...filters, airConditioning: false } });
  if (filters.budget !== null) active.push({ label: BUDGET_LABELS[filters.budget], without: { ...filters, budget: null } });
  if (filters.openNow) active.push({ label: 'Ouvert maintenant', without: { ...filters, openNow: false } });
  return active;
}

export const NOISE_LABELS: Record<NoiseLevel, string> = {
  silencieux: 'Silencieux',
  modere: 'Modéré',
  anime: 'Animé',
};

export const BUDGET_LABELS: Record<'0' | '3' | '6', string> = {
  '0': 'Gratuit',
  '3': 'Moins de 3 DT',
  '6': 'Moins de 6 DT',
};
