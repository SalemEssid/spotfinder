import type pg from 'pg';
import { pool, type Queryable } from '../../db/pool';
import { BUSINESS_TIME_ZONE } from '../../live-meter/live-meter.constants';
import { buildSpotFilterSql, type NoiseLevel, type SpotFilters, type SpotType } from './spot-filters';
import type { CreateSpotInput } from './spots.schemas';

/** A spot row as read from the database (snake_case), joined with equipment and ratings. */
export interface SpotRow {
  id: number;
  name: string;
  type: SpotType;
  address: string;
  area: string;
  latitude: number;
  longitude: number;
  status: 'a_verifier' | 'publie';
  description: string;
  created_at: Date;
  wifi_speed: number;
  outlets_count: number;
  noise_level: NoiseLevel;
  price_level: number;
  air_conditioning: boolean;
  review_count: number;
  avg_wifi: number | null;
  avg_calm: number | null;
  avg_outlets: number | null;
  avg_price: number | null;
  /** End of the opening slot containing "now", e.g. '22:00:00'. NULL = closed right now. */
  closes_at: string | null;
}

export interface OpeningHoursRow {
  weekday: number;
  opens_at: string;
  closes_at: string;
}

/** "Now" expressed as Tunis wall-clock time. `$1` is always the current timestamp. */
const LOCAL_NOW = `($1::timestamptz AT TIME ZONE '${BUSINESS_TIME_ZONE}')`;

const SPOT_SELECT = `
  SELECT s.id, s.name, s.type, s.address, s.area, s.latitude, s.longitude, s.status,
         s.description, s.created_at,
         e.wifi_speed, e.outlets_count, e.noise_level, e.price_level, e.air_conditioning,
         r.review_count, r.avg_wifi, r.avg_calm, r.avg_outlets, r.avg_price,
         open_now.closes_at::text AS closes_at
  FROM spots s
  JOIN equipment e ON e.spot_id = s.id
  -- Community ratings: averages per criterion.
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int                AS review_count,
           AVG(rating_wifi)::float8     AS avg_wifi,
           AVG(rating_calm)::float8     AS avg_calm,
           AVG(rating_outlets)::float8  AS avg_outlets,
           AVG(rating_price)::float8    AS avg_price
    FROM reviews WHERE reviews.spot_id = s.id
  ) r ON true
  -- Today's opening slot that contains the current time (no row = closed now).
  LEFT JOIN LATERAL (
    SELECT oh.closes_at
    FROM opening_hours oh
    WHERE oh.spot_id = s.id
      AND oh.weekday = EXTRACT(DOW FROM ${LOCAL_NOW})
      AND ${LOCAL_NOW}::time >= oh.opens_at
      AND ${LOCAL_NOW}::time <  oh.closes_at
    LIMIT 1
  ) open_now ON true`;

export async function findSpots(filters: SpotFilters, now: Date): Promise<SpotRow[]> {
  const { where, params } = buildSpotFilterSql(filters, [now]);
  const { rows } = await pool.query<SpotRow>(`${SPOT_SELECT} ${where} ORDER BY s.name`, params);
  return rows;
}

export async function findSpotById(id: number, now: Date): Promise<SpotRow | null> {
  const { rows } = await pool.query<SpotRow>(`${SPOT_SELECT} WHERE s.id = $2`, [now, id]);
  return rows[0] ?? null;
}

export async function spotExists(id: number, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query('SELECT 1 FROM spots WHERE id = $1', [id]);
  return rowCount === 1;
}

export async function findOpeningHours(spotId: number): Promise<OpeningHoursRow[]> {
  const { rows } = await pool.query<OpeningHoursRow>(
    `SELECT weekday, opens_at::text, closes_at::text
     FROM opening_hours WHERE spot_id = $1 ORDER BY weekday, opens_at`,
    [spotId],
  );
  return rows;
}

export async function isFavorite(userId: number, spotId: number): Promise<boolean> {
  const { rowCount } = await pool.query('SELECT 1 FROM favorites WHERE user_id = $1 AND spot_id = $2', [
    userId,
    spotId,
  ]);
  return rowCount === 1;
}

export async function hasReviewed(userId: number, spotId: number): Promise<boolean> {
  const { rowCount } = await pool.query('SELECT 1 FROM reviews WHERE user_id = $1 AND spot_id = $2', [
    userId,
    spotId,
  ]);
  return rowCount === 1;
}

/** Inserts the spot, its equipment and its opening hours in one transaction. */
export async function insertSpot(
  client: pg.PoolClient,
  input: CreateSpotInput,
  createdBy: number,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO spots (name, type, address, area, latitude, longitude, description, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'a_verifier', $8) RETURNING id`,
    [input.name, input.type, input.address, input.area, input.latitude, input.longitude, input.description, createdBy],
  );
  const spotId = rows[0]!.id;
  const e = input.equipment;
  await client.query(
    `INSERT INTO equipment (spot_id, wifi_speed, outlets_count, noise_level, price_level, air_conditioning)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [spotId, e.wifiSpeed, e.outletsCount, e.noiseLevel, e.priceLevel, e.airConditioning],
  );
  for (const slot of input.openingHours) {
    await client.query(
      'INSERT INTO opening_hours (spot_id, weekday, opens_at, closes_at) VALUES ($1, $2, $3, $4)',
      [spotId, slot.weekday, slot.opensAt, slot.closesAt],
    );
  }
  return spotId;
}
