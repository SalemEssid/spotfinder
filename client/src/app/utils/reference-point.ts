/**
 * Distances are measured from this point until the user shares their position.
 * SUP'COM campus, El Ghazala (Ariana). Shown in the UI: "350 m de SUP'COM".
 */
export const REFERENCE_POINT = {
  label: 'SUP’COM',
  latitude: 36.8913,
  longitude: 10.1879,
} as const;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}
