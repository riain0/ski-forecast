import { serveStatic } from '@hono/node-server/serve-static';
import { DESTINATIONS, PASS_SEASON, elevationFor } from '#shared/destinations';
import { RateLimitedError, UpstreamError } from '#shared/errors';
import { OpenMeteoClient, type OverviewLocation } from '#shared/openmeteo/client';
import { PUBLIC_ENDPOINTS, customerEndpoints } from '#shared/openmeteo/requests';
import { round } from '#shared/stats';
import type { ApiErrorBody, Availability } from '#shared/types';
import { Hono, type Context } from 'hono';
import { compress } from 'hono/compress';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import { z } from 'zod';
import { POLICIES, SwrCache, type CachePolicy, type CacheResult } from './cache';
import type { Config } from './config';
import { createFetcher } from './http';
import { getAvalanche } from './sources/avalanche';
import { getNwsForecast } from './sources/nws';
import { getSnotel } from './sources/snotel';

const coord = (min: number, max: number) =>
  z.coerce
    .number()
    .min(min)
    .max(max)
    .transform(v => round(v, 3)); // ~100 m: plenty for weather, and raises cache hit rates

const pointQuery = z.object({
  lat: coord(-90, 90),
  lon: coord(-180, 180),
  elevation: z.coerce.number().int().min(-500).max(9000),
});
const geoQuery = z.object({
  lat: coord(-90, 90),
  lon: coord(-180, 180),
  country: z.string().length(2).toUpperCase().optional(),
});

function parseQuery<S extends z.ZodType>(c: Context, schema: S): z.infer<S> {
  const parsed = schema.safeParse(c.req.query());
  if (!parsed.success) throw new HTTPException(400, { message: z.prettifyError(parsed.error) });
  return parsed.data;
}

/**
 * Lets browsers and any CDN reuse a response for as long as the server would treat it as fresh. A stale
 * value is being refreshed right now, so it gets only a minute before clients should ask again.
 */
export function cacheControl(
  policy: CachePolicy,
  { state, ageMs }: Pick<CacheResult<unknown>, 'state' | 'ageMs'>,
) {
  const fresh = state === 'stale' ? 60 : Math.max(60, Math.round((policy.freshMs - ageMs) / 1000));
  const swr = Math.round(policy.staleMs / 1000);
  return `public, max-age=${fresh}, stale-while-revalidate=${swr}`;
}

/** The US agencies cover the US only; skip them for known non-US destinations. */
const outsideUs = (country: string | undefined) => country !== undefined && country !== 'US';

export function createApp(config: Config) {
  const userAgent = `Upslope/2.0 (${config.CONTACT_EMAIL ?? 'https://github.com/riain0/ski-forecast'})`;
  const http = createFetcher(userAgent);
  const cache = new SwrCache();
  const ctx = { fetchJson: http.fetchJson, cache };
  const openMeteo = new OpenMeteoClient(
    http.fetchJson,
    config.OPEN_METEO_API_KEY ? customerEndpoints(config.OPEN_METEO_API_KEY) : PUBLIC_ENDPOINTS,
  );

  const overviewLocations: OverviewLocation[] = DESTINATIONS.map(d => ({
    id: d.id,
    lat: d.lat,
    lon: d.lon,
    elevation: elevationFor(d, 'mid'),
  }));

  /** Runs a cached loader and writes the result with matching HTTP cache headers. */
  async function respond<T>(c: Context, key: string, policy: CachePolicy, load: () => Promise<T>) {
    const result = await cache.get(key, policy, load);
    c.header('Cache-Control', cacheControl(policy, result));
    c.header('Age', String(Math.round(result.ageMs / 1000)));
    c.header('X-Cache', result.state);
    return c.json(result.value as object);
  }

  const app = new Hono();

  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://server.arcgisonline.com'],
        connectSrc: ["'self'", 'https://*.open-meteo.com'],
        frameAncestors: ["'none'"],
      },
    }),
  );
  app.use('*', compress());

  const api = new Hono();

  api.get('/health', c =>
    c.json({ ok: true, uptime: Math.round(process.uptime()), cacheEntries: cache.size }),
  );

  api.get('/status', c => c.json({ cooldowns: http.status() }));

  api.get('/destinations', c => {
    c.header('Cache-Control', 'public, max-age=3600');
    return c.json({ season: PASS_SEASON, destinations: DESTINATIONS });
  });

  api.get('/overview', c =>
    respond(c, 'overview', POLICIES.overview, () => openMeteo.overview(overviewLocations)),
  );

  api.get('/forecast', c => {
    const p = parseQuery(c, pointQuery);
    return respond(c, `mm:${p.lat},${p.lon},${p.elevation}`, POLICIES.multiModel, () =>
      openMeteo.multiModel(p),
    );
  });

  api.get('/ensemble', c => {
    const p = parseQuery(c, pointQuery);
    return respond(c, `ens:${p.lat},${p.lon},${p.elevation}`, POLICIES.ensemble, () => openMeteo.ensemble(p));
  });

  api.get('/current', c => {
    const p = parseQuery(c, pointQuery);
    return respond(c, `cur:${p.lat},${p.lon},${p.elevation}`, POLICIES.current, () => openMeteo.current(p));
  });

  api.get('/nws', async c => {
    const { country, ...p } = parseQuery(c, geoQuery);
    if (outsideUs(country))
      return c.json<Availability<never>>({ available: false, reason: 'NWS covers the US only' });
    const data = await getNwsForecast(ctx, p);
    c.header('Cache-Control', 'public, max-age=600');
    return c.json(data ? { available: true, data } : { available: false, reason: 'Outside NWS coverage' });
  });

  api.get('/snotel', async c => {
    const { country, ...p } = parseQuery(c, geoQuery);
    if (outsideUs(country)) return c.json({ available: false, reason: 'SNOTEL is a US network' });
    c.header('Cache-Control', 'public, max-age=1800');
    return c.json({ available: true, data: await getSnotel(ctx, p) });
  });

  api.get('/avalanche', async c => {
    const { country, ...p } = parseQuery(c, geoQuery);
    if (outsideUs(country))
      return c.json({ available: false, reason: 'avalanche.org covers US centers only' });
    c.header('Cache-Control', 'public, max-age=900');
    return c.json({ available: true, data: await getAvalanche(ctx, p) });
  });

  api.get('/geocode', async c => {
    const q = (c.req.query('q') ?? '').trim().slice(0, 80);
    if (q.length < 2) return c.json([]);
    return respond(c, `geo:${q.toLowerCase()}`, POLICIES.geocode, () => openMeteo.geocode(q));
  });

  api.notFound(c => c.json<ApiErrorBody>({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404));
  app.route('/api', api);

  // Built client: hashed assets are immutable; everything else falls back to the SPA shell.
  app.use(
    '/assets/*',
    serveStatic({
      root: config.CLIENT_DIR,
      onFound: (_path, c) => {
        c.header('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );
  app.use('*', serveStatic({ root: config.CLIENT_DIR }));
  app.get('*', serveStatic({ root: config.CLIENT_DIR, path: 'index.html' }));

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json<ApiErrorBody>({ error: { code: 'BAD_REQUEST', message: err.message } }, err.status);
    }
    if (err instanceof RateLimitedError) {
      c.header('Retry-After', String(Math.max(1, Math.ceil((err.retryAt - Date.now()) / 1000))));
      return c.json<ApiErrorBody>(
        { error: { code: 'UPSTREAM_RATE_LIMITED', message: err.message, retryAt: err.retryAt } },
        503,
      );
    }
    console.error(`[${c.req.method} ${c.req.path}]`, err);
    const message = err instanceof UpstreamError ? `${err.host}: ${err.message}` : 'Upstream data error';
    return c.json<ApiErrorBody>({ error: { code: 'UPSTREAM_ERROR', message } }, 502);
  });

  /** Fills the overview cache so the first visitor after a cold start gets data immediately. */
  const warm = () =>
    cache
      .get('overview', POLICIES.overview, () => openMeteo.overview(overviewLocations))
      .then(() => console.info('[warm] overview cached'))
      .catch((err: unknown) =>
        console.warn('[warm] overview skipped:', err instanceof Error ? err.message : err),
      );

  return { app, warm };
}
