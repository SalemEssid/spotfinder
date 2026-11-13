import { z } from 'zod';
import { NOISE_LEVELS, SPOT_TYPES, type SpotFilters } from './spot-filters';

/** "1"/"true" → true, "0"/"false"/absent → false. */
const flag = z
  .enum(['0', '1', 'true', 'false'])
  .optional()
  .transform((value) => value === '1' || value === 'true');

/** Accepts `a,b` as well as a repeated param `?x=a&x=b`. */
const csv = z.preprocess(
  (value) => (Array.isArray(value) ? value.join(',') : value),
  z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').filter(Boolean) : undefined)),
);

/** URL budget (max price in DT) → max price level stored in the database. */
const MAX_PRICE_LEVEL_BY_BUDGET = { '0': 0, '3': 1, '6': 2 } as const;

/**
 * Query params of GET /api/spots. They are French because they also appear in the
 * Explorer URL that users share: /explorer?bruit=silencieux&wifi=1&prises=1
 */
export const spotListQuerySchema = z
  .object({
    q: z.string().trim().max(80, 'Recherche trop longue.').optional(),
    bruit: csv.pipe(z.array(z.enum(NOISE_LEVELS)).optional()),
    wifi: flag,
    prises: flag,
    clim: flag,
    ouvert: flag,
    budget: z.enum(['0', '3', '6']).optional(),
    type: z.enum(SPOT_TYPES).optional(),
    // Reference point for distances (SUP'COM by default, or the user's position).
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .transform(({ q, bruit, wifi, prises, clim, ouvert, budget, type, lat, lng }) => ({
    filters: {
      q: q || undefined,
      noise: bruit,
      fastWifi: wifi,
      outlets: prises,
      airConditioning: clim,
      openNow: ouvert,
      maxPriceLevel: budget === undefined ? undefined : MAX_PRICE_LEVEL_BY_BUDGET[budget],
      type,
    } satisfies SpotFilters,
    origin: lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : null,
  }));

export const idParamSchema = z.coerce
  .number({ error: 'Identifiant invalide.' })
  .int('Identifiant invalide.')
  .positive('Identifiant invalide.');

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/, 'Heure invalide (format HH:MM).');

/** Body of POST /api/spots ("Ajouter un lieu"). */
export const createSpotSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(80, 'Nom trop long.'),
  type: z.enum(SPOT_TYPES, 'Choisissez un type de lieu.'),
  address: z.string().trim().min(5, 'Adresse trop courte.').max(160, 'Adresse trop longue.'),
  area: z.string().trim().min(2, 'Indiquez le quartier.').max(60, 'Quartier trop long.'),
  description: z.string().trim().max(500, '500 caractères maximum.').default(''),
  // Roughly the bounding box of Tunisia: catches a pin dropped in the sea or on another continent.
  latitude: z.number('Placez le lieu sur la carte.').min(30, 'Le lieu doit être en Tunisie.').max(37.6, 'Le lieu doit être en Tunisie.'),
  longitude: z.number('Placez le lieu sur la carte.').min(7.5, 'Le lieu doit être en Tunisie.').max(11.7, 'Le lieu doit être en Tunisie.'),
  equipment: z.object({
    wifiSpeed: z.number().int().min(0).max(10_000),
    outletsCount: z.number().int().min(0).max(500),
    noiseLevel: z.enum(NOISE_LEVELS),
    priceLevel: z.number().int().min(0).max(3),
    airConditioning: z.boolean(),
  }),
  openingHours: z
    .array(
      z
        .object({ weekday: z.number().int().min(0).max(6), opensAt: time, closesAt: time })
        .refine((slot) => slot.closesAt > slot.opensAt, {
          message: 'L’heure de fermeture doit être après l’ouverture.',
          path: ['closesAt'],
        }),
    )
    .max(21)
    .refine(noOverlappingSlots, 'Deux créneaux du même jour se chevauchent.'),
});

export type CreateSpotInput = z.infer<typeof createSpotSchema>;

function noOverlappingSlots(slots: { weekday: number; opensAt: string; closesAt: string }[]): boolean {
  const sorted = [...slots].sort((a, b) => a.weekday - b.weekday || a.opensAt.localeCompare(b.opensAt));
  return sorted.every((slot, i) => {
    const previous = sorted[i - 1];
    return !previous || previous.weekday !== slot.weekday || previous.closesAt <= slot.opensAt;
  });
}
