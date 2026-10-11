import type { GeoPoint, ModelInfo } from './types';

interface ModelSpec extends ModelInfo {
  /** Approximate forecast range in days; drives request batching. */
  horizonDays: number;
  /** Restricts regional models to their domain. */
  covers?: (p: GeoPoint) => boolean;
}

const inConus = (p: GeoPoint) => p.lat > 24 && p.lat < 50 && p.lon > -126 && p.lon < -66;
const inAlps = (p: GeoPoint) => p.lat > 43.5 && p.lat < 48.5 && p.lon > 5 && p.lon < 17;

/** Deterministic NWP models available through Open-Meteo, in display order. */
export const MODELS: readonly ModelSpec[] = [
  {
    id: 'ecmwf_ifs025',
    name: 'ECMWF IFS',
    agency: 'ECMWF',
    resolution: '9–25 km',
    horizonDays: 15,
    note: 'The global benchmark',
  },
  {
    id: 'ecmwf_aifs025_single',
    name: 'ECMWF AIFS',
    agency: 'ECMWF',
    resolution: '25 km',
    horizonDays: 15,
    note: 'Machine-learning model',
  },
  {
    id: 'gfs_seamless',
    name: 'GFS',
    agency: 'NOAA NCEP',
    resolution: '13–25 km',
    horizonDays: 16,
    note: 'US global model',
  },
  {
    id: 'ncep_hrrr_conus',
    name: 'HRRR',
    agency: 'NOAA NCEP',
    resolution: '3 km',
    horizonDays: 2,
    note: 'Hourly-updating, storm-resolving',
    covers: inConus,
  },
  {
    id: 'ncep_nam_conus',
    name: 'NAM 3 km',
    agency: 'NOAA NCEP',
    resolution: '3 km',
    horizonDays: 3,
    note: 'North American Mesoscale nest',
    covers: inConus,
  },
  {
    id: 'ncep_nbm_conus',
    name: 'NBM',
    agency: 'NOAA NWS',
    resolution: '2.5 km',
    horizonDays: 11,
    note: 'National Blend of Models, bias-corrected',
    covers: inConus,
  },
  {
    id: 'gem_seamless',
    name: 'GEM / HRDPS',
    agency: 'ECCC Canada',
    resolution: '2.5–15 km',
    horizonDays: 10,
    note: 'Canadian global + high-res',
  },
  {
    id: 'icon_seamless',
    name: 'ICON',
    agency: 'DWD Germany',
    resolution: '2–13 km',
    horizonDays: 8,
    note: 'Global / EU / D2 nests',
  },
  {
    id: 'ukmo_seamless',
    name: 'UKMO',
    agency: 'UK Met Office',
    resolution: '2–10 km',
    horizonDays: 7,
    note: 'Unified Model',
  },
  {
    id: 'meteofrance_seamless',
    name: 'ARPEGE / AROME',
    agency: 'Météo-France',
    resolution: '1.3–25 km',
    horizonDays: 4,
    note: 'Global + high-res',
  },
  {
    id: 'jma_seamless',
    name: 'JMA GSM / MSM',
    agency: 'JMA Japan',
    resolution: '5–55 km',
    horizonDays: 11,
    note: 'Japan Meteorological Agency',
  },
  {
    id: 'cma_grapes_global',
    name: 'GRAPES',
    agency: 'CMA China',
    resolution: '15 km',
    horizonDays: 5,
    note: 'China Meteorological Administration',
  },
  {
    id: 'meteoswiss_icon_ch1',
    name: 'ICON-CH1',
    agency: 'MeteoSwiss',
    resolution: '1 km',
    horizonDays: 2,
    note: 'Alpine high-res',
    covers: inAlps,
  },
  {
    id: 'meteoswiss_icon_ch2',
    name: 'ICON-CH2',
    agency: 'MeteoSwiss',
    resolution: '2 km',
    horizonDays: 5,
    note: 'Alpine high-res',
    covers: inAlps,
  },
  {
    id: 'italia_meteo_arpae_icon_2i',
    name: 'ICON-2I',
    agency: 'ItaliaMeteo',
    resolution: '2.2 km',
    horizonDays: 3,
    note: 'Italian high-res',
    covers: inAlps,
  },
];

export const modelInfo = (id: string): ModelInfo | undefined => MODELS.find(m => m.id === id);

export const modelsFor = (p: GeoPoint): ModelSpec[] => MODELS.filter(m => !m.covers || m.covers(p));

export interface ModelBatch {
  models: string[];
  forecastDays: number;
}

/**
 * Splits a location's models into two requests whose length matches the models' range. Open-Meteo bills
 * by data volume (variables × models × days), so short-range models shouldn't pay for 16 days.
 */
export function modelBatches(p: GeoPoint): ModelBatch[] {
  const models = modelsFor(p);
  const short = models.filter(m => m.horizonDays <= 8).map(m => m.id);
  const long = models.filter(m => m.horizonDays > 8).map(m => m.id);
  return [
    { models: long, forecastDays: 16 },
    { models: short, forecastDays: 8 },
  ].filter(b => b.models.length > 0);
}

export const ENSEMBLES = [
  { id: 'ecmwf_ifs025', match: /ecmwf/, name: 'ECMWF ENS', agency: 'ECMWF', members: 51 },
  { id: 'gfs025', match: /gefs|gfs/, name: 'GEFS', agency: 'NOAA', members: 31 },
  { id: 'icon_seamless', match: /icon/, name: 'ICON-EPS', agency: 'DWD', members: 40 },
  { id: 'gem_global', match: /gem/, name: 'GEPS', agency: 'ECCC', members: 21 },
] as const;

/** Lightweight blend used for the all-destinations overview. */
export const OVERVIEW_MODELS = ['ecmwf_ifs025', 'gfs_seamless', 'icon_seamless'] as const;
