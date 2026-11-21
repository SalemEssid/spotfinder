import { withTransaction } from '../../db/pool';
import { notFound } from '../../utils/http-error';
import { distanceInMeters, type Coordinates } from '../../utils/geo';
import {
  getLiveMeters,
  getNextReportAllowedAt,
  type LiveMeterDto,
} from '../live-reports/live-meter.service';
import type { SpotFilters } from './spot-filters';
import {
  findOpeningHours,
  findSpotById,
  findSpots,
  hasReviewed,
  insertSpot,
  isFavorite,
  type SpotRow,
} from './spots.repository';
import type { CreateSpotInput } from './spots.schemas';

/** A place as sent to the browser (camelCase, nested objects). */
export interface SpotSummaryDto {
  id: number;
  name: string;
  type: SpotRow['type'];
  address: string;
  area: string;
  latitude: number;
  longitude: number;
  status: SpotRow['status'];
  equipment: {
    wifiSpeed: number;
    outletsCount: number;
    noiseLevel: SpotRow['noise_level'];
    priceLevel: number;
    airConditioning: boolean;
  };
  openNow: boolean;
  /** "HH:MM" end of the current opening slot, null when closed. */
  closesAt: string | null;
  ratings: {
    wifi: number | null;
    calm: number | null;
    outlets: number | null;
    price: number | null;
    count: number;
  };
  liveMeter: LiveMeterDto;
  /** From the reference point given in ?lat&lng, null otherwise. */
  distanceMeters: number | null;
}

export interface SpotDetailDto extends SpotSummaryDto {
  description: string;
  createdAt: string;
  openingHours: { weekday: number; opensAt: string; closesAt: string }[];
  /** Only meaningful for a logged-in user (false otherwise). */
  isFavorite: boolean;
  hasReviewed: boolean;
  /** When the logged-in user may tap "Je suis ici" again (null = now). */
  nextReportAllowedAt: string | null;
}

/** '22:00:00' → '22:00' */
const hhmm = (time: string) => time.slice(0, 5);
const roundRating = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10);

function toSummary(
  row: SpotRow,
  liveMeter: LiveMeterDto,
  origin: Coordinates | null,
): SpotSummaryDto {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    address: row.address,
    area: row.area,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    equipment: {
      wifiSpeed: row.wifi_speed,
      outletsCount: row.outlets_count,
      noiseLevel: row.noise_level,
      priceLevel: row.price_level,
      airConditioning: row.air_conditioning,
    },
    openNow: row.closes_at !== null,
    closesAt: row.closes_at ? hhmm(row.closes_at) : null,
    ratings: {
      wifi: roundRating(row.avg_wifi),
      calm: roundRating(row.avg_calm),
      outlets: roundRating(row.avg_outlets),
      price: roundRating(row.avg_price),
      count: row.review_count,
    },
    liveMeter,
    distanceMeters: origin ? Math.round(distanceInMeters(origin, row)) : null,
  };
}

/** Explorer list: filtered places, nearest first when a reference point is given. */
export async function listSpots(
  filters: SpotFilters,
  origin: Coordinates | null,
  now: Date,
): Promise<SpotSummaryDto[]> {
  const rows = await findSpots(filters, now);
  const meters = await getLiveMeters(
    rows.map((row) => row.id),
    now,
  );
  const spots = rows.map((row) => toSummary(row, meters.get(row.id)!, origin));
  if (origin) spots.sort((a, b) => a.distanceMeters! - b.distanceMeters!);
  return spots;
}

export async function getSpotDetail(
  id: number,
  userId: number | null,
  origin: Coordinates | null,
  now: Date,
): Promise<SpotDetailDto> {
  const row = await findSpotById(id, now);
  if (!row) throw notFound('Ce lieu n’existe pas (ou plus).');

  const [meters, hours, favorite, reviewed, nextReport] = await Promise.all([
    getLiveMeters([id], now),
    findOpeningHours(id),
    userId ? isFavorite(userId, id) : false,
    userId ? hasReviewed(userId, id) : false,
    userId ? getNextReportAllowedAt(id, userId, now) : null,
  ]);

  return {
    ...toSummary(row, meters.get(id)!, origin),
    description: row.description,
    createdAt: row.created_at.toISOString(),
    openingHours: hours.map((h) => ({
      weekday: h.weekday,
      opensAt: hhmm(h.opens_at),
      closesAt: hhmm(h.closes_at),
    })),
    isFavorite: favorite,
    hasReviewed: reviewed,
    nextReportAllowedAt: nextReport?.toISOString() ?? null,
  };
}

export async function createSpot(
  input: CreateSpotInput,
  userId: number,
  now: Date,
): Promise<SpotDetailDto> {
  const spotId = await withTransaction((client) => insertSpot(client, input, userId));
  return getSpotDetail(spotId, userId, null, now);
}
