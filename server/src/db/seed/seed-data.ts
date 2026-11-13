/**
 * Demo data: fictional places around El Ghazala, Ariana and Tunis.
 * Names are invented (the first four come from our mockups); coordinates are realistic
 * so the map looks right. Distances are measured from SUP'COM (see the client's REFERENCE_POINT).
 */

type SpotType = 'cafe' | 'bibliotheque' | 'coworking' | 'salon_de_the' | 'autre';
type NoiseLevel = 'silencieux' | 'modere' | 'anime';

export interface HoursRow {
  weekday: number; // 0 = Sunday
  opensAt: string;
  closesAt: string;
}

/** What the recent "live" reports should say for this place right after seeding. */
export type LiveScenario =
  | { kind: 'live'; occupancies: number[] } // reports spread over the last 2 h, oldest first
  | { kind: 'history-only' } // nothing recent → "Estimation habituelle"
  | { kind: 'no-data' }; // nothing at all → "Pas encore de signalement"

export interface SeedSpot {
  name: string;
  type: SpotType;
  address: string;
  area: string;
  latitude: number;
  longitude: number;
  description: string;
  status: 'publie' | 'a_verifier';
  equipment: {
    wifiSpeed: number;
    outletsCount: number;
    noiseLevel: NoiseLevel;
    priceLevel: 0 | 1 | 2 | 3;
    airConditioning: boolean;
  };
  hours: HoursRow[];
  /** Added to the hourly crowd profile when generating history: < 0 calmer, > 0 busier. */
  busyness: number;
  live: LiveScenario;
  /** Typical community ratings (1–5) for Wi-Fi, calme, prises, prix. Reviews vary around them. */
  typicalRatings: [number, number, number, number];
}

// --- Opening-hours helpers ----------------------------------------------------------------
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const MON_TO_FRI = [1, 2, 3, 4, 5];
const MON_TO_SAT = [1, 2, 3, 4, 5, 6];

function hours(days: number[], opensAt: string, closesAt: string): HoursRow[] {
  return days.map((weekday) => ({ weekday, opensAt, closesAt }));
}

// --- Places ---------------------------------------------------------------------------------
export const SEED_SPOTS: SeedSpot[] = [
  {
    name: 'Café Le Pupitre',
    type: 'cafe',
    address: 'Rue de la Technologie, El Ghazala',
    area: 'El Ghazala',
    latitude: 36.8942,
    longitude: 10.1893,
    description:
      'Petit café lumineux à deux pas du campus. Grandes tables, ambiance studieuse le matin, plus animée à l’heure du déjeuner.',
    status: 'publie',
    equipment: { wifiSpeed: 30, outletsCount: 8, noiseLevel: 'modere', priceLevel: 1, airConditioning: true },
    hours: hours(ALL_DAYS, '07:00', '22:00'),
    busyness: -0.05,
    live: { kind: 'live', occupancies: [55, 25, 25] },
    typicalRatings: [4, 4, 3, 4],
  },
  {
    name: 'Bibliothèque municipale',
    type: 'bibliotheque',
    address: 'Avenue de l’Environnement, El Ghazala',
    area: 'El Ghazala',
    latitude: 36.8985,
    longitude: 10.183,
    description:
      'Salle de lecture silencieuse, accès libre et gratuit. Idéale pour réviser au calme.',
    status: 'publie',
    equipment: { wifiSpeed: 15, outletsCount: 12, noiseLevel: 'silencieux', priceLevel: 0, airConditioning: true },
    hours: [...hours(MON_TO_FRI, '09:00', '18:00'), ...hours([6], '09:00', '13:00')],
    busyness: -0.2,
    live: { kind: 'live', occupancies: [25, 25] },
    typicalRatings: [3, 5, 4, 5],
  },
  {
    name: 'Salon de thé Nour',
    type: 'salon_de_the',
    address: 'Route de Raoued, Ariana',
    area: 'Raoued',
    latitude: 36.896,
    longitude: 10.2005,
    description:
      'Salon de thé chaleureux, excellent Wi-Fi mais très fréquenté en fin de journée. Peu de prises.',
    status: 'publie',
    equipment: { wifiSpeed: 50, outletsCount: 0, noiseLevel: 'anime', priceLevel: 2, airConditioning: false },
    hours: hours(ALL_DAYS, '10:00', '24:00'),
    busyness: 0.2,
    live: { kind: 'live', occupancies: [55, 85, 85, 85] },
    typicalRatings: [5, 2, 1, 3],
  },
  {
    name: 'Espace coworking Ghazala',
    type: 'coworking',
    address: 'Pôle technologique, El Ghazala',
    area: 'El Ghazala',
    latitude: 36.8745,
    longitude: 10.182,
    description:
      'Coworking professionnel : fibre, salles de réunion, prises à chaque poste. Pass journée.',
    status: 'publie',
    equipment: { wifiSpeed: 100, outletsCount: 40, noiseLevel: 'silencieux', priceLevel: 3, airConditioning: true },
    hours: [...hours(MON_TO_FRI, '08:00', '20:00'), ...hours([6], '09:00', '14:00')],
    busyness: 0,
    live: { kind: 'live', occupancies: [55, 25, 55] },
    typicalRatings: [5, 4, 5, 2],
  },
  {
    name: 'Café L’Encrier',
    type: 'cafe',
    address: 'Avenue Habib Bourguiba, Ariana Ville',
    area: 'Ariana',
    latitude: 36.864,
    longitude: 10.195,
    description: 'Café de quartier avec une salle à l’étage plus calme. Thé à la menthe recommandé.',
    status: 'publie',
    equipment: { wifiSpeed: 20, outletsCount: 4, noiseLevel: 'modere', priceLevel: 1, airConditioning: true },
    hours: hours(ALL_DAYS, '06:30', '23:00'),
    busyness: 0.05,
    live: { kind: 'history-only' },
    typicalRatings: [3, 3, 3, 4],
  },
  {
    name: 'Médiathèque Ennasr',
    type: 'bibliotheque',
    address: 'Rue Hédi Nouira, Cité Ennasr',
    area: 'Ennasr',
    latitude: 36.8565,
    longitude: 10.1625,
    description:
      'Médiathèque moderne avec espace de travail en groupe. Fermée à l’heure du déjeuner.',
    status: 'publie',
    equipment: { wifiSpeed: 25, outletsCount: 20, noiseLevel: 'silencieux', priceLevel: 0, airConditioning: true },
    // Split hours: closed for lunch.
    hours: [...hours(MON_TO_SAT, '09:00', '12:30'), ...hours(MON_TO_SAT, '14:00', '18:30')],
    busyness: -0.1,
    live: { kind: 'live', occupancies: [25] },
    typicalRatings: [4, 5, 4, 5],
  },
  {
    name: 'La Ruche Coworking',
    type: 'coworking',
    address: 'Avenue de l’UMA, Ennasr 2',
    area: 'Ennasr',
    latitude: 36.86,
    longitude: 10.158,
    description: 'Open space convivial, café à volonté inclus dans le pass. Communauté de freelances.',
    status: 'publie',
    equipment: { wifiSpeed: 80, outletsCount: 30, noiseLevel: 'modere', priceLevel: 3, airConditioning: true },
    hours: hours(MON_TO_SAT, '08:30', '21:00'),
    busyness: 0.05,
    live: { kind: 'live', occupancies: [85, 55] },
    typicalRatings: [5, 3, 5, 2],
  },
  {
    name: 'Le Comptoir des Étudiants',
    type: 'cafe',
    address: 'Rue du 1er Juin, El Menzah 6',
    area: 'El Menzah',
    latitude: 36.8455,
    longitude: 10.1775,
    description: 'Le moins cher du quartier, toujours plein d’étudiants. Wi-Fi capricieux.',
    status: 'publie',
    equipment: { wifiSpeed: 8, outletsCount: 6, noiseLevel: 'anime', priceLevel: 1, airConditioning: false },
    hours: hours(ALL_DAYS, '07:00', '23:30'),
    busyness: 0.15,
    live: { kind: 'live', occupancies: [85, 85, 55] },
    typicalRatings: [2, 2, 3, 5],
  },
  {
    name: 'Bibliothèque du Campus El Manar',
    type: 'bibliotheque',
    address: 'Campus universitaire, El Manar',
    area: 'El Manar',
    latitude: 36.8365,
    longitude: 10.152,
    description: 'Grande bibliothèque universitaire ouverte tard en semaine. Très calme.',
    status: 'publie',
    equipment: { wifiSpeed: 20, outletsCount: 30, noiseLevel: 'silencieux', priceLevel: 0, airConditioning: true },
    hours: [...hours(MON_TO_FRI, '08:00', '22:00'), ...hours([6], '09:00', '17:00')],
    busyness: -0.05,
    live: { kind: 'history-only' },
    typicalRatings: [3, 5, 4, 5],
  },
  {
    name: 'Café des Arts',
    type: 'cafe',
    address: 'Rue de Mutuelleville, Tunis',
    area: 'Mutuelleville',
    latitude: 36.8195,
    longitude: 10.1705,
    description: 'Galerie-café avec expositions. Agréable l’après-midi, musique douce.',
    status: 'publie',
    equipment: { wifiSpeed: 25, outletsCount: 3, noiseLevel: 'modere', priceLevel: 2, airConditioning: true },
    hours: hours(ALL_DAYS, '09:00', '22:00'),
    busyness: 0,
    live: { kind: 'live', occupancies: [55] },
    typicalRatings: [4, 3, 2, 3],
  },
  {
    name: 'Salon de thé Yasmine',
    type: 'salon_de_the',
    address: 'Route de la Soukra, La Soukra',
    area: 'La Soukra',
    latitude: 36.8745,
    longitude: 10.229,
    description: 'Jardin ombragé et tables espacées. Calme en matinée.',
    status: 'publie',
    equipment: { wifiSpeed: 12, outletsCount: 2, noiseLevel: 'silencieux', priceLevel: 2, airConditioning: false },
    hours: hours(ALL_DAYS, '08:00', '23:00'),
    busyness: -0.1,
    live: { kind: 'history-only' },
    typicalRatings: [2, 4, 2, 3],
  },
  {
    name: 'Café Les Pages',
    type: 'cafe',
    address: 'Rue de Marseille, Tunis centre',
    area: 'Tunis centre',
    latitude: 36.7995,
    longitude: 10.18,
    description: 'Café-librairie : on peut feuilleter les livres en travaillant. Prises le long du mur.',
    status: 'publie',
    equipment: { wifiSpeed: 30, outletsCount: 10, noiseLevel: 'modere', priceLevel: 2, airConditioning: true },
    hours: hours(MON_TO_SAT, '08:00', '20:00'),
    busyness: 0.05,
    live: { kind: 'live', occupancies: [25, 55, 55] },
    typicalRatings: [4, 3, 4, 3],
  },
  {
    name: 'Le Hub du Lac',
    type: 'coworking',
    address: 'Rue du Lac Biwa, Les Berges du Lac',
    area: 'Les Berges du Lac',
    latitude: 36.838,
    longitude: 10.24,
    description: 'Coworking haut de gamme, cabines téléphoniques et terrasse. Réservation conseillée.',
    status: 'publie',
    equipment: { wifiSpeed: 200, outletsCount: 50, noiseLevel: 'silencieux', priceLevel: 3, airConditioning: true },
    hours: hours(MON_TO_FRI, '08:00', '19:00'),
    busyness: -0.05,
    live: { kind: 'live', occupancies: [25, 25, 55] },
    typicalRatings: [5, 5, 5, 1],
  },
  {
    name: 'Maison des jeunes de Raoued',
    type: 'autre',
    address: 'Avenue de la République, Raoued',
    area: 'Raoued',
    latitude: 36.92,
    longitude: 10.185,
    description: 'Salle d’étude gratuite ouverte aux étudiants l’après-midi.',
    status: 'publie',
    equipment: { wifiSpeed: 10, outletsCount: 6, noiseLevel: 'modere', priceLevel: 0, airConditioning: false },
    hours: hours(MON_TO_SAT, '14:00', '20:00'),
    busyness: 0,
    live: { kind: 'history-only' },
    typicalRatings: [2, 3, 3, 5],
  },
  {
    name: 'Café Panorama Ghazala',
    type: 'cafe',
    address: 'Boulevard de la Terre, El Ghazala',
    area: 'El Ghazala',
    latitude: 36.8955,
    longitude: 10.178,
    description: 'Nouveau café avec vue dégagée, proposé par un membre. En attente de vérification.',
    status: 'a_verifier', // added by the demo user: shows the "À vérifier" badge
    equipment: { wifiSpeed: 40, outletsCount: 15, noiseLevel: 'anime', priceLevel: 1, airConditioning: true },
    hours: hours(ALL_DAYS, '08:00', '24:00'),
    busyness: 0,
    live: { kind: 'no-data' },
    typicalRatings: [4, 2, 4, 4],
  },
];

// --- People -----------------------------------------------------------------------------------
export const DEMO_USER = {
  name: 'Compte Démo',
  email: 'demo@spotfinder.tn',
  // Documented in the README. Only ever used for the local demo.
  password: 'SpotFinder2026',
};

/** Fictional community members: they wrote the seeded reviews and live reports. */
export const COMMUNITY_USERS = [
  'Yasmine B.',
  'Amine K.',
  'Sarra M.',
  'Mehdi T.',
  'Ines R.',
  'Karim H.',
  'Lina G.',
  'Omar Z.',
];

/** Review comments, picked depending on how good the place is. */
export const POSITIVE_COMMENTS = [
  'Parfait pour réviser, je reviens chaque semaine.',
  'Wi-Fi stable toute la journée, j’ai pu faire une visio sans coupure.',
  'Calme le matin, idéal avant les cours.',
  'Personnel sympa, on ne nous presse pas de partir.',
  'Prises disponibles presque à chaque table.',
];
export const MIXED_COMMENTS = [
  'Bien en début d’après-midi, mais ça se remplit vite.',
  'Correct, sans plus. Venez tôt pour avoir une place près d’une prise.',
  'Bon endroit mais un peu bruyant à l’heure du déjeuner.',
  'Le Wi-Fi coupe parfois, prévoyez un partage de connexion.',
];
export const NEGATIVE_COMMENTS = [
  'Trop de monde le soir, impossible de se concentrer.',
  'Aucune prise accessible, ma batterie n’a pas tenu.',
  'Musique trop forte pour travailler.',
];

/** The demo account's own activity, so "Espace membre" is not empty on first launch. */
export const DEMO_FAVORITES = ['Café Le Pupitre', 'Bibliothèque municipale', 'Espace coworking Ghazala'];
export const DEMO_REVIEWS: { spot: string; ratings: [number, number, number, number]; comment: string }[] = [
  {
    spot: 'Café Le Pupitre',
    ratings: [4, 4, 4, 5],
    comment: 'Mon QG pour les révisions : bon Wi-Fi et l’étage est calme avant midi.',
  },
  {
    spot: 'Bibliothèque municipale',
    ratings: [3, 5, 4, 5],
    comment: 'Silence total, parfait pour les examens. Le Wi-Fi est un peu lent.',
  },
];
