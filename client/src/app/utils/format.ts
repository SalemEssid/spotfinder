import type { SpotType } from '../models/spot.model';

const MINUTE = 60_000;

/** 350 → "350 m", 1240 → "1,2 km" (French decimal comma). */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  const km = meters / 1000;
  return `${km.toLocaleString('fr-FR', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

/** "à l'instant", "il y a 10 min", "il y a 1 h 05", "il y a 3 j". */
export function formatRelativeTime(iso: string | Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / MINUTE);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `il y a ${hours} h ${String(rest).padStart(2, '0')}` : `il y a ${hours} h`;
  }
  return `il y a ${Math.floor(hours / 24)} j`;
}

/** Minutes left before `iso` (rounded up), 0 if it is in the past. */
export function minutesUntil(iso: string, now: Date): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / MINUTE));
}

export const PRICE_LABELS = ['Gratuit', 'Moins de 3 DT', '3 à 6 DT', 'Plus de 6 DT'] as const;
export const PRICE_SHORT_LABELS = ['Gratuit', '< 3 DT', '3–6 DT', '> 6 DT'] as const;

export function formatPrice(level: number): string {
  return PRICE_SHORT_LABELS[level] ?? '?';
}

/** '24:00' → 'minuit', '08:30' → '08:30'. */
export function formatTime(time: string): string {
  return time === '24:00' || time === '00:00' ? 'minuit' : time;
}

export function wifiLabel(speedMbps: number): string {
  if (speedMbps === 0) return 'Pas de Wi-Fi';
  if (speedMbps >= 20) return 'Wi-Fi rapide';
  return 'Wi-Fi lent';
}

export const SPOT_TYPE_LABELS: Record<SpotType, string> = {
  cafe: 'Café',
  bibliotheque: 'Bibliothèque',
  coworking: 'Coworking',
  salon_de_the: 'Salon de thé',
  autre: 'Autre lieu',
};

/** Monday first, as on a French calendar. Index = JS weekday (0 = Sunday). */
export const WEEKDAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Weekday (0 = Sunday) of `date` on a Tunis wall clock, whatever the visitor's time zone. */
export function tunisWeekday(date: Date): number {
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Africa/Tunis' }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

export const NOISE_DESCRIPTIONS = {
  silencieux: 'Ambiance silencieuse',
  modere: 'Ambiance modérée',
  anime: 'Ambiance animée',
} as const;

/** 4.25 → "4,3" */
export function formatRating(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

/** "Yasmine B." → "YB" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
