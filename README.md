# Ikon Snow

Ski-focused snow tracking and forecasting for every Ikon Pass destination — multi-model, elevation-aware, with ensembles and observations.

## What's inside

| Source | What you get |
|---|---|
| **12 deterministic models** via [Open-Meteo](https://open-meteo.com) | ECMWF IFS, ECMWF AIFS (AI), GFS, GEM/HRDPS, ICON, UKMO, ARPEGE/AROME, JMA, CMA GRAPES — plus regional high-res **HRRR, NAM 3 km, NBM** (US) and **ICON-CH1/CH2, ICON-2I** (Alps), chosen automatically |
| **4 ensembles, 143 members** | GEFS, ECMWF ENS, ICON-EPS, GEM GEPS → 10th–90th percentile plume and "chance of ≥ 6/12/24 in" |
| **NOAA NWS** (US) | Official forecast text, gridded snowfall & snow level, active watches/warnings, Area Forecast Discussion |
| **USDA SNOTEL** (US) | Measured snow depth, SWE, 24/72 h change at the nearest stations |
| **avalanche.org** (US) | Current danger rating for the resort's forecast zone |

**Pages**
- **Dashboard** — every destination ranked by 72 h snow, region filters, favorites, sortable table with 10-day sparkbars.
- **Map** — destinations shaded by 24 h / 72 h / 7 d / 10 d snow.
- **Resort** — base/mid/summit forecasts, 16-day outlook, model-by-model heat table, accumulation chart, ensemble plume, hourly temp/freezing level/wind, NWS, SNOTEL, avalanche, past 14 days.
- **Search** — any Ikon resort, or any town/peak/`lat,lon` worldwide (saved as a custom spot).

**Smart snow** (default; toggle "Raw" in the header): models compute snowfall at their grid-cell elevation with a fixed ~7:1 ratio. Smart mode re-partitions rain/snow using temperature downscaled to the elevation you choose and applies a temperature-based snow-to-liquid ratio (~8:1 near freezing to ~17:1 in cold storms). See `lib/snow.js`.

## Run locally

```bash
npm install
npm start          # http://localhost:3000
npm test           # boots the server and hits every endpoint against live APIs
```

Requires Node 20+. No API keys needed.

## Deploy to Render

1. Push this folder to a GitHub (or GitLab) repo.
2. In Render: **New → Blueprint**, pick the repo. `render.yaml` sets up a free Node web service.
   (Or **New → Web Service**: build `npm ci --omit=dev`, start `npm start`, health check `/api/health`.)
3. Optional env vars:
   - `CONTACT_EMAIL` — included in the User-Agent for api.weather.gov (NWS requests contact info).
   - `OPEN_METEO_API_KEY` — Open-Meteo's free API is for **non-commercial** use (~10k calls/day). If you make this public/commercial, buy a key and set this; the app switches to the customer endpoints automatically.

Free Render instances sleep after 15 min idle; the first request then takes ~30–60 s. The server warms its dashboard cache at startup.

## Notes

- Responses are cached in memory (overview 60 min, models 30 min, ensembles 60 min, NWS 30 min, SNOTEL 60 min) and Open-Meteo requests are limited to 3 concurrent to respect the free tier.
- The destination list lives in `data/resorts.json` (2025/26 Ikon partners, with base/summit elevations). Ikon changes partners most seasons — edit that file to add or remove resorts.
- Independent project; not affiliated with Ikon Pass / Alterra Mountain Company. Forecasts are guidance — check resort reports and your avalanche center.

## Layout

```
server.js            Express app + API routes
lib/openmeteo.js     deterministic models, ensembles, current conditions, dashboard overview
lib/snow.js          smart snow (rain/snow split + snow ratio), stats helpers
lib/nws.js           NWS forecast, grid snowfall/snow level, AFD, alerts
lib/snotel.js        NRCS AWDB SNOTEL stations + daily data
lib/avalanche.js     avalanche.org zone lookup (point-in-polygon)
lib/http.js          fetch w/ retries, per-host concurrency limits, TTL cache
public/              single-page app (vanilla JS, Chart.js, Leaflet)
data/resorts.json    Ikon destinations
```
