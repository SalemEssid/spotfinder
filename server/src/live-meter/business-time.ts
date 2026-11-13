import { BUSINESS_TIME_ZONE } from './live-meter.constants';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  weekday: 'short',
  hour: 'numeric',
  hourCycle: 'h23',
});

/**
 * Weekday (0 = Sunday, like SQL EXTRACT(DOW)) and hour of `date` on a Tunis wall clock,
 * whatever the time zone of the server running the code.
 */
export function tunisWeekdayAndHour(date: Date): { weekday: number; hour: number } {
  const parts = formatter.formatToParts(date);
  const weekday = WEEKDAYS.indexOf(parts.find((part) => part.type === 'weekday')!.value);
  const hour = Number(parts.find((part) => part.type === 'hour')!.value);
  return { weekday, hour };
}
