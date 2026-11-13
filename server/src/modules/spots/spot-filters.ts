/**
 * Explorer filters → SQL conditions.
 *
 * This is a pure function (no database access) so the filter logic can be unit-tested on its own.
 * It never concatenates user input into SQL: every value becomes a `$n` parameter.
 *
 * The SQL it produces expects these aliases from the spots query:
 *   s = spots, e = equipment, open_now = today's opening slot containing "now" (NULL if closed).
 */

export const SPOT_TYPES = ['cafe', 'bibliotheque', 'coworking', 'salon_de_the', 'autre'] as const;
export type SpotType = (typeof SPOT_TYPES)[number];

export const NOISE_LEVELS = ['silencieux', 'modere', 'anime'] as const;
export type NoiseLevel = (typeof NOISE_LEVELS)[number];

/** "Wi-Fi rapide" means at least this speed. */
export const FAST_WIFI_MBPS = 20;

export interface SpotFilters {
  /** Free text matched against name, area and address (accent-insensitive). */
  q?: string;
  noise?: NoiseLevel[];
  fastWifi?: boolean;
  outlets?: boolean;
  airConditioning?: boolean;
  /** 0 = free only, 1 = < 3 DT, 2 = < 6 DT. */
  maxPriceLevel?: number;
  openNow?: boolean;
  type?: SpotType;
  /** Internal only (not a URL param): restrict to a user's favourites. */
  favoriteOfUserId?: number;
}

export interface SqlFragment {
  /** `WHERE …` or an empty string when there is no filter. */
  where: string;
  params: unknown[];
}

/**
 * @param filters      validated filters
 * @param firstParams  parameters already used by the surrounding query ($1, $2…)
 */
export function buildSpotFilterSql(filters: SpotFilters, firstParams: unknown[] = []): SqlFragment {
  const params = [...firstParams];
  const conditions: string[] = [];
  /** Adds a value to the parameter list and returns its placeholder ($3, $4, …). */
  const param = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.q) {
    // Escape LIKE wildcards typed by the user, then search "anywhere in the text".
    const pattern = param(`%${filters.q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`);
    conditions.push(
      `(unaccent(s.name) ILIKE unaccent(${pattern}) OR unaccent(s.area) ILIKE unaccent(${pattern})` +
        ` OR unaccent(s.address) ILIKE unaccent(${pattern}))`,
    );
  }
  if (filters.noise?.length) {
    conditions.push(`e.noise_level = ANY(${param(filters.noise)}::noise_level[])`);
  }
  if (filters.fastWifi) {
    conditions.push(`e.wifi_speed >= ${param(FAST_WIFI_MBPS)}`);
  }
  if (filters.outlets) {
    conditions.push('e.outlets_count > 0');
  }
  if (filters.airConditioning) {
    conditions.push('e.air_conditioning');
  }
  if (filters.maxPriceLevel !== undefined) {
    conditions.push(`e.price_level <= ${param(filters.maxPriceLevel)}`);
  }
  if (filters.openNow) {
    conditions.push('open_now.closes_at IS NOT NULL');
  }
  if (filters.type) {
    conditions.push(`s.type = ${param(filters.type)}`);
  }
  if (filters.favoriteOfUserId !== undefined) {
    conditions.push(
      `EXISTS (SELECT 1 FROM favorites f WHERE f.spot_id = s.id AND f.user_id = ${param(filters.favoriteOfUserId)})`,
    );
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}
