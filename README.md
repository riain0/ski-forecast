# Upslope

Mountain snow forecasts for every Ikon Pass destination (2026/27): every major weather model side by side,
ensemble odds, the NWS forecasters' own words, measured snowpack and avalanche danger, at the elevation
you actually ski.

Live: https://ikon-snow.onrender.com · https://forecast.riaincondon.com

## What it shows

| Source | Data |
| --- | --- |
| **12 deterministic models** via [Open-Meteo](https://open-meteo.com) | ECMWF IFS, ECMWF AIFS, GFS, GEM/HRDPS, ICON, UKMO, ARPEGE/AROME, JMA, CMA GRAPES; plus HRRR, NAM 3 km and NBM in the US and ICON-CH1/CH2 and ICON-2I in the Alps |
| **4 ensembles, 143 members** | ECMWF ENS, GEFS, ICON-EPS, GEPS → 10th–90th percentile plume and "chance of at least…" tables |
| **NOAA NWS** (US) | Gridded snowfall and snow level, period forecasts, alerts, Area Forecast Discussion |
| **USDA SNOTEL** (US) | Measured snow depth, SWE and 24/72 h change at the nearest stations |
| **avalanche.org** (US) | Danger rating for the resort's forecast zone |

Snow is computed from each model's precipitation and the temperature downscaled to base, mid or summit:
a rain/snow split at that height, then either a temperature-based snow-to-liquid ratio (**Auto**) or a fixed
**10:1**. See `src/shared/snow.ts` and the in-app Method page.

## Architecture

```
src/
  shared/          Isomorphic TypeScript: runs on the server and in the browser
    openmeteo/       request builders, pure response processors, client with an injected fetcher
    snow.ts          rain/snow partition + snow-to-liquid ratio
    models.ts        model catalogue, regional domains, request batching
    destinations.ts  Ikon 2026/27 destinations with base/summit elevations
  server/          Hono on Node
    http.ts          fetcher: per-host concurrency limits, rate-limit cooldowns
    cache.ts         stale-while-revalidate cache with request coalescing
    sources/         NWS, SNOTEL, avalanche.org adapters
    app.ts           routes (zod-validated), CSP, compression, static client
  client/          React 19 + Vite
    api/data.ts      server-first loading with direct-to-Open-Meteo fallback
    components/      SVG charts, icons, search, UI primitives
    pages/           Board, Map, Method, mountain page sections
tests/             Vitest: snow physics, processors, cache, fetcher, NWS/avalanche helpers
scripts/smoke.ts   end-to-end check against live APIs (local or deployed)
```

### Staying inside Open-Meteo's free tier

Open-Meteo's free API is limited per IP (about 10,000 weighted calls a day), and Render's free instances share
outbound IPs with other apps, so the server's quota can run out regardless of our own traffic. The app is
built around that:

1. **Cheap requests.** Models are batched into two requests per location, sized to their forecast range.
   Snow is derived from precipitation and temperature, so the dashboard costs one weighted call per mountain.
2. **Shared server cache.** Stale-while-revalidate, with lifetimes matched to model update cycles. Concurrent
   requests for the same data share one upstream call.
3. **Real backoff.** On a 429 the server stops calling Open-Meteo until the limit resets (minutely, hourly or
   midnight UTC) and serves stale data where it has it.
4. **Browser fallback.** If the server is rate-limited, the browser calls Open-Meteo directly through the same
   shared code, spending the visitor's own quota. Ensembles, the heaviest request, load only when scrolled into view.

Setting `OPEN_METEO_API_KEY` switches the server to Open-Meteo's paid endpoints, which removes the shared-IP
problem entirely (and is required for commercial use).

## Develop

```bash
npm install
npm run dev        # API on :3000, Vite on :5173 with /api proxied
npm run check      # typecheck (TypeScript 7) + ESLint + Prettier + Vitest
npm run build      # dist/client (Vite) + dist/server (tsup)
npm start          # serve the production build on $PORT (default 3000)
npm run smoke      # live end-to-end check; BASE_URL=https://… to test a deployment
```

Node 22+. TypeScript 7 does the type-checking; TypeScript 6 is installed only because typescript-eslint
doesn't support 7 yet.

## Deploy (Render)

`render.yaml` defines the service. If the service was created by hand rather than from the blueprint, set
these in the Render dashboard:

- **Build command:** `npm ci --include=dev && npm run build && npm prune --omit=dev`
- **Start command:** `npm start`
- **Health check path:** `/api/health`
- **Environment:** `NODE_VERSION=22`, `NODE_ENV=production`; optional `CONTACT_EMAIL`, `OPEN_METEO_API_KEY`

Custom domain: add `forecast.riaincondon.com` under the service's **Settings → Custom Domains**, then create
the `CNAME` record Render shows you at your DNS provider.

## Notes

- The destination list is from ikonpass.com (checked October 2026). Partners change most seasons; edit
  `src/shared/destinations.ts`.
- Independent project, not affiliated with Ikon Pass or Alterra Mountain Company.
