import type { Units } from './prefs';

/** Unit-aware formatters. Inputs are always metric (cm, °C, km/h, m). */
export function formatters(units: Units) {
  const us = units === 'us';
  const snowValue = (cm: number) => (us ? cm / 2.54 : cm);
  const snowNumber = (cm: number | null | undefined): string => {
    if (cm == null || Number.isNaN(cm)) return '–';
    const v = snowValue(cm);
    if (v < 0.05) return '0';
    return v < 10 ? v.toFixed(1).replace(/\.0$/, '') : String(Math.round(v));
  };
  return {
    us,
    snowUnit: us ? 'in' : 'cm',
    snowUnitLong: us ? 'inches' : 'centimetres',
    snowValue,
    snowNumber,
    snow: (cm: number | null | undefined) => (cm == null ? '–' : `${snowNumber(cm)}${us ? '″' : ' cm'}`),
    snowRange: (min: number, max: number) => `${snowNumber(min)}–${snowNumber(max)}`,
    tempValue: (c: number) => (us ? (c * 9) / 5 + 32 : c),
    temp: (c: number | null | undefined) =>
      c == null || Number.isNaN(c) ? '–' : `${Math.round(us ? (c * 9) / 5 + 32 : c)}°`,
    tempUnit: us ? '°F' : '°C',
    windValue: (k: number) => (us ? k * 0.621371 : k),
    wind: (k: number | null | undefined) =>
      k == null || Number.isNaN(k) ? '–' : `${Math.round(us ? k * 0.621371 : k)}`,
    windUnit: us ? 'mph' : 'km/h',
    heightValue: (m: number) => (us ? m * 3.28084 : m),
    height: (m: number | null | undefined) =>
      m == null || Number.isNaN(m)
        ? '–'
        : `${Math.round(us ? m * 3.28084 : m).toLocaleString('en-US')} ${us ? 'ft' : 'm'}`,
    heightUnit: us ? 'ft' : 'm',
    distance: (km: number) => (us ? `${(km * 0.621371).toFixed(1)} mi` : `${km.toFixed(1)} km`),
  };
}

export type Formatters = ReturnType<typeof formatters>;

const COMPASS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
];
export const compass = (deg: number) => COMPASS[Math.round(deg / 22.5) % 16] ?? '';

export const weekday = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
export const monthDay = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

export function relativeTime(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 48 * 60) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} d ago`;
}

/** "Sun 3p" in resort-local time. */
export function hourLabel(unix: number, utcOffset: number): string {
  const d = new Date((unix + utcOffset) * 1000);
  const h = d.getUTCHours();
  const day = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return `${day} ${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;
}

/** Compact axis/tooltip number: up to two decimals, no trailing zeros. */
export const tick = (v: number) => String(Number(v.toFixed(v >= 10 ? 0 : 2)));

/** Sequential snow ramp step (0 = none … 7 = deepest), by centimetres. */
export function snowStep(cm: number | null | undefined): number {
  if (cm == null) return -1;
  const thresholds = [0.25, 2.5, 7.5, 15, 25, 40, 60];
  return thresholds.filter(t => cm >= t).length;
}
