/**
 * Domain types shared by the server and the browser. All physical quantities are metric:
 * snow in centimetres, precipitation in millimetres, temperature in °C, wind in km/h, heights in metres.
 */

export type SnowMode = 'auto' | 'fixed';
export type ElevationBand = 'base' | 'mid' | 'summit';

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface ForecastPoint extends GeoPoint {
  /** Elevation (m) the forecast is downscaled to. */
  elevation: number;
}

export type Region =
  | 'Colorado'
  | 'Utah'
  | 'Northern Rockies'
  | 'California'
  | 'Pacific Northwest'
  | 'Southwest'
  | 'Alaska'
  | 'Northeast'
  | 'Mid-Atlantic'
  | 'Midwest'
  | 'Western Canada'
  | 'Eastern Canada'
  | 'Alps'
  | 'Pyrenees'
  | 'Japan'
  | 'Korea & China'
  | 'Australia & NZ'
  | 'South America';

/** Multi-resort season passes we track. A destination on none of them is independent. */
export type Pass = 'ikon' | 'epic' | 'mountain-collective' | 'indy';

export interface Destination extends GeoPoint {
  id: string;
  name: string;
  /** Passes that include this mountain for the current season; empty for independents. */
  passes: readonly Pass[];
  /** Umbrella destination on the pass, when one pass entry covers several mountains (e.g. SkiBig3). */
  group?: string;
  region: Region;
  /** ISO 3166-1 alpha-2. */
  country: string;
  /** State / province / prefecture shorthand. */
  admin?: string;
  /** Base and summit lift-served elevations (m). */
  base: number;
  summit: number;
  url?: string;
}

/** A user-saved location that isn't in the destination list. */
export interface CustomSpot extends GeoPoint {
  id: string;
  name: string;
  label: string;
  elevation: number;
}

export interface Stat {
  median: number;
  mean: number;
  min: number;
  max: number;
  /** Number of models contributing. */
  n: number;
}

/** A value computed with the temperature-based snow ratio (`auto`) and with a fixed 10:1 ratio. */
export interface BySnowMode<T> {
  auto: T;
  fixed: T;
}

export type ForecastWindow = 'next24' | 'next48' | 'next72' | 'next5d' | 'next7d' | 'next10d' | 'next16d';
export type OverviewWindow = 'past24' | 'past48' | 'next24' | 'next72' | 'next7d' | 'next10d';

// ---------------------------------------------------------------------------------------------
// Deterministic multi-model forecast
// ---------------------------------------------------------------------------------------------

export type Series = (number | null)[];

export interface ModelInfo {
  id: string;
  name: string;
  agency: string;
  resolution: string;
  note: string;
}

export interface ModelDay {
  date: string;
  /** False when the model doesn't cover (most of) this day. */
  complete: boolean;
  snow: BySnowMode<number | null>;
  precip: number | null;
  tmin: number | null;
  tmax: number | null;
  gust: number | null;
  freezingLevel: number | null;
}

export interface ModelHourly {
  snow: BySnowMode<Series>;
  precip: Series;
  temp: Series;
  freezingLevel: Series;
  wind: Series;
  gust: Series;
}

export interface ModelRun extends ModelInfo {
  horizonHours: number;
  windows: Record<ForecastWindow, BySnowMode<number | null>>;
  daily: ModelDay[];
  hourly: ModelHourly;
}

export interface ConsensusDay {
  date: string;
  snow: BySnowMode<Stat | null>;
  tmin: number | null;
  tmax: number | null;
  gust: number | null;
  freezingLevel: number | null;
}

export interface MultiModelForecast {
  generatedAt: string;
  point: ForecastPoint;
  timezone: string;
  utcOffset: number;
  gridElevation: number;
  /** Hourly unix timestamps (s), shared by every series. */
  time: number[];
  /** Index of the current hour in `time`. */
  nowIndex: number;
  models: ModelRun[];
  unavailable: { id: string; reason: string }[];
  consensus: {
    hourly: {
      snow: BySnowMode<Series>;
      temp: Series;
      tempMin: Series;
      tempMax: Series;
      freezingLevel: Series;
      wind: Series;
      gust: Series;
    };
    daily: ConsensusDay[];
    windows: Record<ForecastWindow, BySnowMode<Stat | null>>;
  };
}

// ---------------------------------------------------------------------------------------------
// Ensembles
// ---------------------------------------------------------------------------------------------

export interface Percentiles {
  p10: Series;
  p50: Series;
  p90: Series;
}

export type EnsembleWindow = 'next24' | 'next72' | 'next7d' | 'next10d' | 'next14d';

export interface EnsembleSystem {
  id: string;
  name: string;
  agency: string;
  members: number;
  horizonHours: number;
  /** Sorted member totals per window; null when the window exceeds this system's range. */
  totals: BySnowMode<Record<EnsembleWindow, number[] | null>>;
}

export interface EnsembleForecast {
  generatedAt: string;
  point: ForecastPoint;
  timezone: string;
  utcOffset: number;
  time: number[];
  systems: EnsembleSystem[];
  /** Equal-weighted blend of all systems, accumulated from now. */
  grand: BySnowMode<Percentiles>;
}

// ---------------------------------------------------------------------------------------------
// Current conditions
// ---------------------------------------------------------------------------------------------

export interface CurrentConditions {
  point: ForecastPoint;
  timezone: string;
  utcOffset: number;
  observedAt: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  weatherCode: number;
  cloudCover: number;
  windSpeed: number;
  windGust: number;
  windDirection: number;
  freezingLevel: number | null;
  isDay: boolean;
  sunrise: string | null;
  sunset: string | null;
  history: { date: string; snow: number; tmax: number | null; tmin: number | null }[];
}

// ---------------------------------------------------------------------------------------------
// Overview (every destination, light 3-model blend)
// ---------------------------------------------------------------------------------------------

export interface OverviewEntry {
  id: string;
  elevation: number;
  timezone: string;
  now: { temp: number | null; weatherCode: number | null; wind: number | null; isDay: boolean };
  windows: Record<OverviewWindow, BySnowMode<Stat | null>>;
  daily: { date: string; snow: BySnowMode<number | null> }[];
}

export interface Overview {
  generatedAt: string;
  models: string[];
  entries: OverviewEntry[];
}

// ---------------------------------------------------------------------------------------------
// US agency sources
// ---------------------------------------------------------------------------------------------

export interface NwsPeriod {
  name: string;
  start: string;
  isDaytime: boolean;
  temperatureF: number;
  wind: string;
  summary: string;
  detail: string;
  precipChance: number | null;
}

export interface NwsAlert {
  event: string;
  headline: string;
  severity: string;
  description: string;
  instruction: string | null;
  ends: string | null;
}

export interface NwsForecast {
  office: string;
  officeUrl: string;
  timeZone: string;
  updatedAt: string | null;
  gridElevation: number | null;
  periods: NwsPeriod[];
  snowDaily: { date: string; cm: number }[];
  snowLevel: { date: string; min: number; max: number }[];
  discussion: { issuedAt: string; text: string } | null;
  alerts: NwsAlert[];
}

export interface SnotelReading {
  date: string;
  depth: number | null;
  swe: number | null;
  temp: number | null;
}

export interface SnotelStation {
  id: string;
  name: string;
  state: string;
  distanceKm: number;
  elevation: number;
  url: string;
  latest: SnotelReading | null;
  change24: number | null;
  change72: number | null;
  series: SnotelReading[];
}

export interface AvalancheRating {
  center: string;
  zone: string;
  link: string;
  level: number | null;
  label: string;
  travelAdvice: string;
  offSeason: boolean;
  nearestZoneOnly: boolean;
}

export interface GeocodeResult extends GeoPoint {
  name: string;
  label: string;
  elevation: number;
}

/** Response from the US-only endpoints. */
export type Availability<T> = { available: true; data: T } | { available: false; reason: string };

/** Error envelope returned by every API route. */
export interface ApiErrorBody {
  error: {
    code: 'NOT_FOUND' | 'BAD_REQUEST' | 'UPSTREAM_RATE_LIMITED' | 'UPSTREAM_ERROR';
    message: string;
    /** Epoch ms when the upstream limit is expected to reset (rate limits only). */
    retryAt?: number;
  };
}
