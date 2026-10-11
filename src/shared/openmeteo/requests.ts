import type { ForecastPoint } from '../types';

export interface OpenMeteoEndpoints {
  forecast: string;
  ensemble: string;
  geocoding: string;
  elevation: string;
  apiKey?: string;
}

/** Free, non-commercial endpoints (rate limited per client IP). */
export const PUBLIC_ENDPOINTS: OpenMeteoEndpoints = {
  forecast: 'https://api.open-meteo.com/v1/forecast',
  ensemble: 'https://ensemble-api.open-meteo.com/v1/ensemble',
  geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
  elevation: 'https://api.open-meteo.com/v1/elevation',
};

/** Paid endpoints, used by the server when OPEN_METEO_API_KEY is set. */
export const customerEndpoints = (apiKey: string): OpenMeteoEndpoints => ({
  forecast: 'https://customer-api.open-meteo.com/v1/forecast',
  ensemble: 'https://customer-ensemble-api.open-meteo.com/v1/ensemble',
  geocoding: 'https://customer-geocoding-api.open-meteo.com/v1/search',
  elevation: 'https://customer-api.open-meteo.com/v1/elevation',
  apiKey,
});

type Params = Record<string, string | number | undefined>;

function build(base: string, params: Params, apiKey?: string): string {
  const all: Params = { ...params, apikey: apiKey };
  const qs = Object.keys(all)
    .flatMap(k => (all[k] === undefined ? [] : [`${k}=${encodeURIComponent(String(all[k]))}`]))
    .join('&');
  return `${base}?${qs}`;
}

const pointParams = (p: ForecastPoint): Params => ({
  latitude: p.lat,
  longitude: p.lon,
  elevation: p.elevation,
});

/** Variables requested per deterministic model. Snow is derived from precipitation + temperature. */
export const DETAIL_HOURLY = [
  'precipitation',
  'temperature_2m',
  'freezing_level_height',
  'wind_speed_10m',
  'wind_gusts_10m',
] as const;

export const multiModelUrl = (
  e: OpenMeteoEndpoints,
  p: ForecastPoint,
  models: string[],
  forecastDays: number,
) =>
  build(
    e.forecast,
    {
      ...pointParams(p),
      hourly: DETAIL_HOURLY.join(','),
      models: models.join(','),
      forecast_days: forecastDays,
      timezone: 'auto',
      timeformat: 'unixtime',
    },
    e.apiKey,
  );

export const ensembleUrl = (e: OpenMeteoEndpoints, p: ForecastPoint, models: string[]) =>
  build(
    e.ensemble,
    {
      ...pointParams(p),
      hourly: 'precipitation,temperature_2m',
      models: models.join(','),
      forecast_days: 15,
      timezone: 'auto',
      timeformat: 'unixtime',
    },
    e.apiKey,
  );

export const CURRENT_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'weather_code',
  'cloud_cover',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'freezing_level_height',
  'is_day',
] as const;

export const currentUrl = (e: OpenMeteoEndpoints, p: ForecastPoint) =>
  build(
    e.forecast,
    {
      ...pointParams(p),
      current: CURRENT_VARS.join(','),
      daily: 'snowfall_sum,temperature_2m_max,temperature_2m_min,sunrise,sunset',
      past_days: 14,
      forecast_days: 1,
      timezone: 'auto',
    },
    e.apiKey,
  );

/**
 * One request for many locations. Hourly precip + temperature for 3 models plus 4 current variables keeps
 * each location at 10 variables, which Open-Meteo bills as a single call.
 */
export const overviewUrl = (e: OpenMeteoEndpoints, points: ForecastPoint[], models: readonly string[]) =>
  build(
    e.forecast,
    {
      latitude: points.map(p => p.lat).join(','),
      longitude: points.map(p => p.lon).join(','),
      elevation: points.map(p => p.elevation).join(','),
      hourly: 'precipitation,temperature_2m',
      models: models.join(','),
      current: 'temperature_2m,weather_code,wind_speed_10m,is_day',
      past_days: 2,
      forecast_days: 11,
      timezone: 'auto',
      timeformat: 'unixtime',
    },
    e.apiKey,
  );

export const geocodeUrl = (e: OpenMeteoEndpoints, query: string) =>
  build(e.geocoding, { name: query, count: 8, language: 'en', format: 'json' }, e.apiKey);

export const elevationUrl = (e: OpenMeteoEndpoints, lat: number, lon: number) =>
  build(e.elevation, { latitude: lat, longitude: lon }, e.apiKey);
