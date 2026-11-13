// Types of the JSON sent by the API (they mirror the server DTOs in server/src/modules/*).

export type SpotType = 'cafe' | 'bibliotheque' | 'coworking' | 'salon_de_the' | 'autre';
export type SpotStatus = 'a_verifier' | 'publie';
export type NoiseLevel = 'silencieux' | 'modere' | 'anime';

/** Label shown next to a crowd percentage. */
export type CrowdLevel = 'calme' | 'modere' | 'sature';
/** What a user picks in "Je suis ici". */
export type ReportChoice = 'calme' | 'moyen' | 'sature';

export interface LiveMeter {
  /** live = recent reports · habituel = usual level at this hour · aucun = no data. */
  source: 'live' | 'habituel' | 'aucun';
  occupancy: number | null;
  level: CrowdLevel | null;
  reportCount: number;
  lastReportAt: string | null;
  /** Σ weights of the live estimate, used for the optimistic update. */
  totalWeight: number;
  confidence: 'faible' | 'moyenne' | 'bonne' | null;
}

export interface Equipment {
  wifiSpeed: number;
  outletsCount: number;
  noiseLevel: NoiseLevel;
  /** 0 free · 1 < 3 DT · 2 3–6 DT · 3 > 6 DT */
  priceLevel: number;
  airConditioning: boolean;
}

export interface Ratings {
  wifi: number | null;
  calm: number | null;
  outlets: number | null;
  price: number | null;
  count: number;
}

export interface SpotSummary {
  id: number;
  name: string;
  type: SpotType;
  address: string;
  area: string;
  latitude: number;
  longitude: number;
  status: SpotStatus;
  equipment: Equipment;
  openNow: boolean;
  closesAt: string | null;
  ratings: Ratings;
  liveMeter: LiveMeter;
  distanceMeters: number | null;
}

export interface OpeningSlot {
  weekday: number;
  opensAt: string;
  closesAt: string;
}

export interface SpotDetail extends SpotSummary {
  description: string;
  createdAt: string;
  openingHours: OpeningSlot[];
  isFavorite: boolean;
  hasReviewed: boolean;
  nextReportAllowedAt: string | null;
}

export interface ReportResult {
  liveMeter: LiveMeter;
  nextReportAllowedAt: string;
}

export interface HourlyProfile {
  weekday: number;
  currentHour: number;
  hours: { hour: number; occupancy: number; level: CrowdLevel }[];
  bestHour: number | null;
}

export interface NewSpot {
  name: string;
  type: SpotType;
  address: string;
  area: string;
  description: string;
  latitude: number;
  longitude: number;
  equipment: Equipment;
  openingHours: OpeningSlot[];
}
