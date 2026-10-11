/**
 * Data access for the UI.
 *
 * Forecast data is loaded server-first: the server's shared cache means one upstream call serves every
 * visitor. Free Open-Meteo quotas are per IP, though, and a host like Render shares egress IPs between many
 * apps. When the server reports it's rate limited (or is unreachable), the browser calls Open-Meteo directly
 * using the same shared client code, so each visitor spends their own quota instead.
 *
 * Results are cached by TanStack Query and each query is persisted to IndexedDB, so reloads and return
 * visits render from saved data while anything stale refetches in the background.
 */
import { QueryClient, queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import {
  experimental_createQueryPersister,
  type AsyncStorage,
  type PersistedQuery,
} from '@tanstack/react-query-persist-client';
import { createStore, del as idbDel, entries as idbEntries, get as idbGet, set as idbSet } from 'idb-keyval';
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
// Query cache: TanStack Query in memory, each query persisted to IndexedDB
// ---------------------------------------------------------------------------------------------

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * How long each kind of data stays current. Forecasts only change when a model run lands (hourly for HRRR
 * and NBM, every 6 hours for the global models), so refetching more often than this just spends quota.
 *
 * - `staleTime`: after this, the data is still shown but refetched in the background.
 * - `keepFor`: saved data older than this is discarded rather than shown.
 */
const FRESHNESS = {
  overview: { staleTime: 1 * HOUR, keepFor: 1 * DAY },
  forecast: { staleTime: 1 * HOUR, keepFor: 12 * HOUR },
  ensemble: { staleTime: 3 * HOUR, keepFor: 1 * DAY },
  current: { staleTime: 15 * MIN, keepFor: 3 * HOUR },
  nws: { staleTime: 30 * MIN, keepFor: 6 * HOUR },
  snotel: { staleTime: 1 * HOUR, keepFor: 12 * HOUR },
  avalanche: { staleTime: 1 * HOUR, keepFor: 12 * HOUR },
  geocode: { staleTime: 30 * DAY, keepFor: 30 * DAY },
} as const;
type Kind = keyof typeof FRESHNESS;

/** IndexedDB via idb-keyval. Storage failures (private windows, full disks) just mean no persistence. */
const idb = createStore('upslope', 'queries');
const storage: AsyncStorage<PersistedQuery> = {
  getItem: key => idbGet<PersistedQuery>(key, idb).catch(() => undefined),
  setItem: (key, value) => idbSet(key, value, idb).catch(() => undefined),
  removeItem: key => idbDel(key, idb).catch(() => undefined),
  entries: () => idbEntries<string, PersistedQuery>(idb).catch((): [string, PersistedQuery][] => []),
};

const createPersister = (kind: Kind) =>
  experimental_createQueryPersister<PersistedQuery>({
    storage,
    prefix: `upslope-${kind}`,
    maxAge: FRESHNESS[kind].keepFor,
    buster: __BUILD_ID__,
    // IndexedDB stores objects directly (structured clone), so skip the JSON round trip.
    serialize: q => q,
    deserialize: q => q,
  });
const persisters = Object.fromEntries(
  (Object.keys(FRESHNESS) as Kind[]).map(kind => [kind, createPersister(kind)]),
) as Record<Kind, ReturnType<typeof createPersister>>;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The loaders already fall back from server to browser; retry once, and only what might be transient.
      retry: (failures, err) =>
        failures < 1 &&
        !(err instanceof ApiError && (err.status === 400 || err.status === 404)) &&
        !(err instanceof UpstreamError && err.rateLimited),
    },
  },
});

// Each kind of query (keyed by its first key segment) gets its freshness and its persister.
for (const kind of Object.keys(FRESHNESS) as Kind[]) {
  queryClient.setQueryDefaults([kind], {
    staleTime: FRESHNESS[kind].staleTime,
    // In-memory retention for unused queries; setTimeout can't schedule past ~24.8 days.
    gcTime: Math.min(FRESHNESS[kind].keepFor, DAY),
    persister: persisters[kind].persisterFn,
  });
}

/** Removes expired and previous-build entries from IndexedDB once the page is idle. */
export function cleanUpStorage() {
  const run = () => {
    for (const p of Object.values(persisters)) p.persisterGc().catch(() => undefined);
    try {
      localStorage.removeItem('upslope:overview:v2'); // the overview cache before TanStack Query
    } catch {
      // Storage unavailable.
    }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 10_000 });
  else setTimeout(run, 5_000);
}

const pointQuery = (p: ForecastPoint) =>
  `lat=${p.lat.toFixed(3)}&lon=${p.lon.toFixed(3)}&elevation=${Math.round(p.elevation)}`;
const geoQuery = (g: GeoPoint, country?: string) =>
  `lat=${g.lat.toFixed(3)}&lon=${g.lon.toFixed(3)}${country ? `&country=${country}` : ''}`;

// ---------------------------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------------------------

const overviewQuery = queryOptions({
  queryKey: ['overview' satisfies Kind],
  queryFn: () =>
    serverFirst<Overview>('/api/overview', () =>
      direct.overview(
        DESTINATIONS.map(d => ({ id: d.id, lat: d.lat, lon: d.lon, elevation: elevationFor(d, 'mid') })),
      ),
    ),
});

const forecastQuery = (p: ForecastPoint) =>
  queryOptions({
    queryKey: ['forecast' satisfies Kind, pointQuery(p)],
    queryFn: () =>
      serverFirst<MultiModelForecast>(`/api/forecast?${pointQuery(p)}`, () => direct.multiModel(p)),
  });

const ensembleQuery = (p: ForecastPoint) =>
  queryOptions({
    queryKey: ['ensemble' satisfies Kind, pointQuery(p)],
    queryFn: () => serverFirst<EnsembleForecast>(`/api/ensemble?${pointQuery(p)}`, () => direct.ensemble(p)),
  });

const currentQuery = (p: ForecastPoint) =>
  queryOptions({
    queryKey: ['current' satisfies Kind, pointQuery(p)],
    queryFn: () => serverFirst<CurrentConditions>(`/api/current?${pointQuery(p)}`, () => direct.current(p)),
  });

const nwsQuery = (g: GeoPoint, country?: string) =>
  queryOptions({
    queryKey: ['nws' satisfies Kind, geoQuery(g, country)],
    queryFn: () => getJson<Availability<NwsForecast>>(`/api/nws?${geoQuery(g, country)}`),
  });

const snotelQuery = (g: GeoPoint, country?: string) =>
  queryOptions({
    queryKey: ['snotel' satisfies Kind, geoQuery(g, country)],
    queryFn: () => getJson<Availability<SnotelStation[]>>(`/api/snotel?${geoQuery(g, country)}`),
  });

const avalancheQuery = (g: GeoPoint, country?: string) =>
  queryOptions({
    queryKey: ['avalanche' satisfies Kind, geoQuery(g, country)],
    queryFn: () => getJson<Availability<AvalancheRating | null>>(`/api/avalanche?${geoQuery(g, country)}`),
  });

const geocodeQuery = (q: string) =>
  queryOptions({
    queryKey: ['geocode' satisfies Kind, q.toLowerCase()],
    queryFn: async () =>
      (await serverFirst<GeocodeResult[]>(`/api/geocode?q=${encodeURIComponent(q)}`, () => direct.geocode(q)))
        .data,
  });

// ---------------------------------------------------------------------------------------------
// Public API: Suspense hooks for components, plus imperative place search
// ---------------------------------------------------------------------------------------------

export const useOverview = () => useSuspenseQuery(overviewQuery).data;
export const useForecast = (p: ForecastPoint) => useSuspenseQuery(forecastQuery(p)).data;
export const useEnsemble = (p: ForecastPoint) => useSuspenseQuery(ensembleQuery(p)).data;
export const useCurrent = (p: ForecastPoint) => useSuspenseQuery(currentQuery(p)).data;
export const useNws = (g: GeoPoint, country?: string) => useSuspenseQuery(nwsQuery(g, country)).data;
export const useSnotel = (g: GeoPoint, country?: string) => useSuspenseQuery(snotelQuery(g, country)).data;
export const useAvalanche = (g: GeoPoint, country?: string) =>
  useSuspenseQuery(avalancheQuery(g, country)).data;

/** Warms the all-mountains overview that the board and map draw. A fresh cached copy is left alone. */
export const prefetchOverview = (): void => {
  queryClient.query(overviewQuery).catch(() => undefined);
};

/**
 * Warms the cache for the top of one place's forecast page: current conditions, the model forecast and
 * the NWS forecast. Each is keyed by the place's point, so every mountain is cached separately, and fresh
 * cached data is not fetched again.
 */
export function prefetchPlace(p: ForecastPoint, g: GeoPoint, country?: string): void {
  const ignore = () => undefined;
  queryClient.query(currentQuery(p)).catch(ignore);
  queryClient.query(forecastQuery(p)).catch(ignore);
  queryClient.query(nwsQuery(g, country)).catch(ignore);
}

export const geocode = (q: string) => queryClient.query(geocodeQuery(q));

/** Human message for a failed load. */
export function describeError(err: unknown): string {
  if (err instanceof UpstreamError && err.rateLimited) {
    return 'The free forecast quota for your network is used up for now. Try again later.';
  }
  if (err instanceof ApiError && err.code === 'NETWORK')
    return 'Can’t reach the server. Check your connection.';
  return err instanceof Error ? err.message : 'Something went wrong loading this data.';
}
