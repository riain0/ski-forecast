/**
 * Data access for the UI.
 *
 * Forecast data is loaded server-first: the server's shared cache means one upstream call serves every
 * visitor. Free Open-Meteo quotas are per IP, though, and a host like Render shares egress IPs between many
 * apps. When the server reports it's rate limited (or is unreachable), the browser calls Open-Meteo directly
 * using the same shared client code, so each visitor spends their own quota instead.
 */
import { DESTINATIONS, elevationFor } from '#shared/destinations';
import { UpstreamError } from '#shared/errors';
import { OpenMeteoClient, type JsonFetcher } from '#shared/openmeteo/client';
import type {
  ApiErrorBody,
  Availability,
  AvalancheRating,
  CurrentConditions,
  EnsembleForecast,
  ForecastPoint,
  GeocodeResult,
  GeoPoint,
  MultiModelForecast,
  NwsForecast,
  Overview,
  SnotelStation,
} from '#shared/types';

export type DataPath = 'server' | 'browser';
export interface Sourced<T> {
  data: T;
  via: DataPath;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorBody['error']['code'] | 'NETWORK',
    message: string,
    readonly retryAt?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------------------------
// Browser → Open-Meteo
// ---------------------------------------------------------------------------------------------

let active = 0;
const queue: (() => void)[] = [];
const browserFetch: JsonFetcher = async (url, { timeoutMs = 30_000 } = {}) => {
  if (active >= 2) await new Promise<void>(resolve => queue.push(resolve));
  active++;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const body = (await res.json().catch(() => null)) as { reason?: string } | null;
    if (!res.ok) throw new UpstreamError(new URL(url).host, res.status, body?.reason ?? `HTTP ${res.status}`);
    return body;
  } finally {
    active--;
    queue.shift()?.();
  }
};
const direct = new OpenMeteoClient(browserFetch);

// ---------------------------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------------------------

const BLOCK_KEY = 'upslope:server-limited-until';
let serverLimitedUntil = Number(sessionStorage.getItem(BLOCK_KEY) ?? 0);

async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Server unreachable');
  }
  if (res.ok) return (await res.json()) as T;
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  throw new ApiError(
    res.status,
    body?.error.code ?? 'UPSTREAM_ERROR',
    body?.error.message ?? `HTTP ${res.status}`,
    body?.error.retryAt,
  );
}

async function serverFirst<T>(path: string, fallback: () => Promise<T>): Promise<Sourced<T>> {
  if (Date.now() >= serverLimitedUntil) {
    try {
      return { data: await getJson<T>(path), via: 'server' };
    } catch (err) {
      if (!(err instanceof ApiError) || err.status === 400 || err.status === 404) throw err;
      if (err.code === 'UPSTREAM_RATE_LIMITED') {
        serverLimitedUntil = err.retryAt ?? Date.now() + 10 * 60_000;
        sessionStorage.setItem(BLOCK_KEY, String(serverLimitedUntil));
      }
    }
  }
  return { data: await fallback(), via: 'browser' };
}

// ---------------------------------------------------------------------------------------------
// Promise cache for React's `use()`: stable promise identity per key, with expiry
// ---------------------------------------------------------------------------------------------

const promises = new Map<string, { promise: Promise<unknown>; expires: number }>();

function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = promises.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise as Promise<T>;
  const promise = load();
  promises.set(key, { promise, expires: Date.now() + ttlMs });
  promise.catch(() => promises.delete(key));
  return promise;
}

const pointQuery = (p: ForecastPoint) =>
  `lat=${p.lat.toFixed(3)}&lon=${p.lon.toFixed(3)}&elevation=${Math.round(p.elevation)}`;
const pointKey = (p: ForecastPoint) => pointQuery(p);
const MIN = 60_000;

// ---------------------------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------------------------

const OVERVIEW_STORE = 'upslope:overview:v2';
const OVERVIEW_TTL = 90 * MIN;

/** The all-mountains overview; also persisted locally so return visits render instantly. */
export function loadOverview(): Promise<Sourced<Overview>> {
  return cached('overview', OVERVIEW_TTL, async () => {
    try {
      const saved = JSON.parse(localStorage.getItem(OVERVIEW_STORE) ?? 'null') as Sourced<Overview> | null;
      if (saved && Date.now() - Date.parse(saved.data.generatedAt) < OVERVIEW_TTL) return saved;
    } catch {
      // Ignore unreadable storage.
    }
    const result = await serverFirst('/api/overview', () =>
      direct.overview(
        DESTINATIONS.map(d => ({ id: d.id, lat: d.lat, lon: d.lon, elevation: elevationFor(d, 'mid') })),
      ),
    );
    try {
      localStorage.setItem(OVERVIEW_STORE, JSON.stringify(result));
    } catch {
      // Storage full or unavailable.
    }
    return result;
  });
}

export const loadForecast = (p: ForecastPoint) =>
  cached(`mm:${pointKey(p)}`, 30 * MIN, () =>
    serverFirst<MultiModelForecast>(`/api/forecast?${pointQuery(p)}`, () => direct.multiModel(p)),
  );

export const loadEnsemble = (p: ForecastPoint) =>
  cached(`ens:${pointKey(p)}`, 60 * MIN, () =>
    serverFirst<EnsembleForecast>(`/api/ensemble?${pointQuery(p)}`, () => direct.ensemble(p)),
  );

export const loadCurrent = (p: ForecastPoint) =>
  cached(`cur:${pointKey(p)}`, 15 * MIN, () =>
    serverFirst<CurrentConditions>(`/api/current?${pointQuery(p)}`, () => direct.current(p)),
  );

const geoQuery = (g: GeoPoint, country?: string) =>
  `lat=${g.lat.toFixed(3)}&lon=${g.lon.toFixed(3)}${country ? `&country=${country}` : ''}`;

export const loadNws = (g: GeoPoint, country?: string) =>
  cached(`nws:${geoQuery(g, country)}`, 15 * MIN, () =>
    getJson<Availability<NwsForecast>>(`/api/nws?${geoQuery(g, country)}`),
  );

export const loadSnotel = (g: GeoPoint, country?: string) =>
  cached(`snotel:${geoQuery(g, country)}`, 30 * MIN, () =>
    getJson<Availability<SnotelStation[]>>(`/api/snotel?${geoQuery(g, country)}`),
  );

export const loadAvalanche = (g: GeoPoint, country?: string) =>
  cached(`avy:${geoQuery(g, country)}`, 15 * MIN, () =>
    getJson<Availability<AvalancheRating | null>>(`/api/avalanche?${geoQuery(g, country)}`),
  );

export const geocode = (q: string) =>
  cached(
    `geo:${q.toLowerCase()}`,
    24 * 60 * MIN,
    async () =>
      (await serverFirst<GeocodeResult[]>(`/api/geocode?q=${encodeURIComponent(q)}`, () => direct.geocode(q)))
        .data,
  );

/** Human message for a failed load. */
export function describeError(err: unknown): string {
  if (err instanceof UpstreamError && err.rateLimited) {
    return 'The free forecast quota for your network is used up for now. Try again later.';
  }
  if (err instanceof ApiError && err.code === 'NETWORK')
    return 'Can’t reach the server. Check your connection.';
  return err instanceof Error ? err.message : 'Something went wrong loading this data.';
}
