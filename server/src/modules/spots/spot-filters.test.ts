import { describe, expect, it } from 'vitest';
import { buildSpotFilterSql, FAST_WIFI_MBPS } from './spot-filters';

const NOW = new Date('2026-11-12T14:00:00Z');

describe('buildSpotFilterSql', () => {
  it('returns no WHERE clause without filters', () => {
    expect(buildSpotFilterSql({}, [NOW])).toEqual({ where: '', params: [NOW] });
  });

  it('numbers new parameters after the ones already used', () => {
    const { where, params } = buildSpotFilterSql({ maxPriceLevel: 1 }, [NOW]);
    expect(where).toBe('WHERE e.price_level <= $2');
    expect(params).toEqual([NOW, 1]);
  });

  it('combines several filters with AND', () => {
    const { where, params } = buildSpotFilterSql({ fastWifi: true, outlets: true, openNow: true });
    expect(where).toBe(
      `WHERE e.wifi_speed >= $1 AND e.outlets_count > 0 AND open_now.closes_at IS NOT NULL`,
    );
    expect(params).toEqual([FAST_WIFI_MBPS]);
  });

  it('passes noise levels as one array parameter', () => {
    const { where, params } = buildSpotFilterSql({ noise: ['silencieux', 'modere'] });
    expect(where).toBe('WHERE e.noise_level = ANY($1::noise_level[])');
    expect(params).toEqual([['silencieux', 'modere']]);
  });

  it('ignores an empty noise list', () => {
    expect(buildSpotFilterSql({ noise: [] }).where).toBe('');
  });

  it('searches name, area and address with one parameter, accent-insensitive', () => {
    const { where, params } = buildSpotFilterSql({ q: 'ghazala' });
    expect(where.match(/\$1/g)).toHaveLength(3);
    expect(where).toContain('unaccent(s.name) ILIKE unaccent($1)');
    expect(params).toEqual(['%ghazala%']);
  });

  it('never puts user text inside the SQL and escapes LIKE wildcards', () => {
    const { where, params } = buildSpotFilterSql({ q: "100%_'; DROP TABLE spots; --" });
    expect(where).not.toContain('DROP');
    expect(params).toEqual(["%100\\%\\_'; DROP TABLE spots; --%"]);
  });

  it('restricts to favourites with an EXISTS sub-query', () => {
    const { where, params } = buildSpotFilterSql({ favoriteOfUserId: 7 });
    expect(where).toContain('f.user_id = $1');
    expect(params).toEqual([7]);
  });
});
