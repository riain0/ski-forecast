// Open-Meteo: deterministic NWP models, ensembles, current conditions, and the dashboard overview.
const { cached, fetchJSON } = require('./http');
const { smartSnowCm, median, quantile, round1 } = require('./snow');

const KEY = process.env.OPEN_METEO_API_KEY;
const HOST = {
  forecast: KEY ? 'https://customer-api.open-meteo.com/v1/forecast' : 'https://api.open-meteo.com/v1/forecast',
  ensemble: KEY ? 'https://customer-ensemble-api.open-meteo.com/v1/ensemble' : 'https://ensemble-api.open-meteo.com/v1/ensemble',
};
const withKey = qs => (KEY ? `${qs}&apikey=${encodeURIComponent(KEY)}` : qs);

// Deterministic models. `when` restricts regional models to their domains.
const MODELS = {
  ecmwf_ifs025:         { name: 'ECMWF IFS', org: 'ECMWF (Europe)', res: '9–25 km', note: 'The global benchmark model' },
  ecmwf_aifs025_single: { name: 'ECMWF AIFS', org: 'ECMWF (Europe)', res: '25 km', note: 'ECMWF machine-learning model' },
  gfs_seamless:         { name: 'GFS', org: 'NOAA / NCEP (US)', res: '13–25 km', note: 'US global model' },
  ncep_hrrr_conus:      { name: 'HRRR', org: 'NOAA / NCEP (US)', res: '3 km', note: 'Rapid-refresh convection-allowing, 48 h', when: r => inConus(r) },
  ncep_nam_conus:       { name: 'NAM 3 km', org: 'NOAA / NCEP (US)', res: '3 km', note: 'North American Mesoscale nest, 60 h', when: r => inConus(r) },
  ncep_nbm_conus:       { name: 'NBM', org: 'NOAA / NWS (US)', res: '2.5 km', note: 'National Blend of Models (bias-corrected blend)', when: r => inConus(r) },
  gem_seamless:         { name: 'GEM / HRDPS', org: 'ECCC (Canada)', res: '2.5–15 km', note: 'Canadian global + high-res regional' },
  icon_seamless:        { name: 'ICON', org: 'DWD (Germany)', res: '2–13 km', note: 'ICON global/EU/D2 seamless' },
  ukmo_seamless:        { name: 'UKMO', org: 'UK Met Office', res: '2–10 km', note: 'Unified Model global' },
  meteofrance_seamless: { name: 'ARPEGE / AROME', org: 'Météo-France', res: '1.3–25 km', note: 'Seamless global + high-res' },
  jma_seamless:         { name: 'JMA GSM / MSM', org: 'JMA (Japan)', res: '5–55 km', note: 'Japan Meteorological Agency' },
  cma_grapes_global:    { name: 'GRAPES', org: 'CMA (China)', res: '15 km', note: 'China Meteorological Administration' },
  meteoswiss_icon_ch1:  { name: 'ICON-CH1', org: 'MeteoSwiss', res: '1 km', note: 'Alpine high-res, 33 h', when: r => inAlps(r) },
  meteoswiss_icon_ch2:  { name: 'ICON-CH2', org: 'MeteoSwiss', res: '2 km', note: 'Alpine high-res, 5 days', when: r => inAlps(r) },
  italia_meteo_arpae_icon_2i: { name: 'ICON-2I', org: 'ItaliaMeteo ARPAE', res: '2.2 km', note: 'Italian high-res', when: r => inAlps(r) },
};

const ENSEMBLES = {
  gfs025:        { name: 'GEFS', org: 'NOAA', members: 31 },
  ecmwf_ifs025:  { name: 'ECMWF ENS', org: 'ECMWF', members: 51 },
  icon_seamless: { name: 'ICON-EPS', org: 'DWD', members: 40 },
  gem_global:    { name: 'GEM GEPS', org: 'ECCC', members: 21 },
};

function inConus(r) { return r.lat > 24 && r.lat < 50 && r.lon > -126 && r.lon < -66; }
function inAlps(r) { return r.lat > 43.5 && r.lat < 48.5 && r.lon > 5 && r.lon < 17; }

function modelsFor(r) {
  return Object.keys(MODELS).filter(k => !MODELS[k].when || MODELS[k].when(r));
}

const r2 = v => (v == null ? null : Math.round(v * 100) / 100);
const localDate = (t, off) => new Date((t + off) * 1000).toISOString().slice(0, 10);
const nowHour = () => Math.floor(Date.now() / 3600e3) * 3600;

// Sum `arr` over hourly `time` (unix s) for hours in [from, to). Returns null if any hour in range is null
// or the series doesn't reach `to` (i.e. model horizon too short).
function windowSum(time, arr, from, to) {
  let s = 0, n = 0;
  for (let i = 0; i < time.length; i++) {
    if (time[i] < from || time[i] >= to) continue;
    if (arr[i] == null) return null;
    s += arr[i]; n++;
  }
  const expected = Math.round((to - from) / 3600);
  return n >= expected * 0.95 ? s : null;
}

const WINDOWS = { past24: [-24, 0], past48: [-48, 0], next24: [0, 24], next48: [0, 48], next72: [0, 72], next5d: [0, 120], next7d: [0, 168], next10d: [0, 240], next16d: [0, 372] };

// ---------------------------------------------------------------------------------------------
// Deterministic multi-model forecast for one point
// ---------------------------------------------------------------------------------------------
const HOURLY = 'snowfall,precipitation,temperature_2m,freezing_level_height,wind_speed_10m,wind_gusts_10m,cloud_cover';

async function fetchModel(point, model) {
  const qs = `latitude=${point.lat}&longitude=${point.lon}&elevation=${point.elev}&hourly=${HOURLY}` +
    `&models=${model}&past_days=2&forecast_days=16&timezone=auto&timeformat=unixtime`;
  return fetchJSON(`${HOST.forecast}?${withKey(qs)}`);
}

function processModel(id, j) {
  const h = j.hourly;
  const off = j.utc_offset_seconds || 0;
  const pick = name => h[name] || h[`${name}_${id}`] || [];
  const time = h.time;
  const raw = pick('snowfall'), precip = pick('precipitation'), temp = pick('temperature_2m');
  const fz = pick('freezing_level_height'), wind = pick('wind_speed_10m'), gust = pick('wind_gusts_10m'), cloud = pick('cloud_cover');
  // A model hour counts if precipitation (or snowfall) is present; temperature fills smart snow.
  const smart = time.map((_, i) => (precip[i] == null && raw[i] == null ? null : smartSnowCm(raw[i], precip[i], temp[i])));
  const hasData = smart.some(v => v != null);
  if (!hasData) return null;
  let last = -1;
  smart.forEach((v, i) => { if (v != null) last = i; });

  // Daily aggregation in resort-local days.
  const days = new Map();
  time.forEach((t, i) => {
    const d = localDate(t, off);
    if (!days.has(d)) days.set(d, { date: d, hours: 0, have: 0, raw: 0, smart: 0, precip: 0, tmin: null, tmax: null, gust: null, fz: [] });
    const D = days.get(d);
    D.hours++;
    if (smart[i] != null) { D.have++; D.smart += smart[i]; D.raw += raw[i] || 0; D.precip += precip[i] || 0; }
    if (temp[i] != null) { D.tmin = D.tmin == null ? temp[i] : Math.min(D.tmin, temp[i]); D.tmax = D.tmax == null ? temp[i] : Math.max(D.tmax, temp[i]); }
    if (gust[i] != null) D.gust = D.gust == null ? gust[i] : Math.max(D.gust, gust[i]);
    if (fz[i] != null) D.fz.push(fz[i]);
  });
  const daily = [...days.values()].map(D => {
    const ok = D.have >= D.hours * 0.75 && D.hours >= 20;
    return {
      date: D.date, ok,
      raw: ok ? r2(D.raw) : null, smart: ok ? r2(D.smart) : null, precip: ok ? r2(D.precip) : null,
      tmin: round1(D.tmin), tmax: round1(D.tmax), gust: round1(D.gust),
      fz: D.fz.length ? Math.round(median(D.fz)) : null,
    };
  });

  const t0 = nowHour();
  const windows = {};
  for (const [k, [a, b]] of Object.entries(WINDOWS)) {
    windows[k] = {
      smart: r2(windowSum(time, smart, t0 + a * 3600, t0 + b * 3600)),
      raw: r2(windowSum(time, raw.map((v, i) => (smart[i] == null ? null : v || 0)), t0 + a * 3600, t0 + b * 3600)),
    };
  }

  return {
    id, ...MODELS[id],
    horizonHours: Math.max(0, Math.round((time[last] - t0) / 3600)),
    windows, daily,
    hourly: { raw: raw.map(r2), smart: smart.map(r2), precip: precip.map(r2), temp: temp.map(round1), fz: fz.map(v => (v == null ? null : Math.round(v))), wind: wind.map(round1), gust: gust.map(round1), cloud },
    _time: time, _off: off, _tz: j.timezone, _gridElev: j.elevation,
  };
}

function summarize(vals) {
  const v = vals.filter(x => x != null);
  if (!v.length) return null;
  return { median: r2(median(v)), mean: r2(v.reduce((a, b) => a + b, 0) / v.length), min: r2(Math.min(...v)), max: r2(Math.max(...v)), n: v.length };
}

async function getMultiModel(point) {
  const key = `mm:${point.lat},${point.lon},${point.elev}`;
  return cached(key, 30 * 60e3, async () => {
    const ids = modelsFor(point);
    const results = await Promise.allSettled(ids.map(id => fetchModel(point, id)));
    const models = [];
    const errors = [];
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') {
        const m = processModel(ids[i], res.value);
        if (m) models.push(m); else errors.push({ id: ids[i], error: 'No snowfall data' });
      } else errors.push({ id: ids[i], error: res.reason.reason || res.reason.message });
    });
    if (!models.length) throw new Error('No forecast models returned data: ' + errors.map(e => `${e.id}: ${e.error}`).join('; '));

    // Use the longest-running model's time axis; all share the same request window.
    const ref = models.reduce((a, b) => (b._time.length > a._time.length ? b : a));
    const time = ref._time;
    for (const m of models) {
      if (m._time.length !== time.length || m._time[0] !== time[0]) {
        // Re-align defensively by timestamp.
        const idx = new Map(m._time.map((t, i) => [t, i]));
        for (const k of Object.keys(m.hourly)) m.hourly[k] = time.map(t => (idx.has(t) ? m.hourly[k][idx.get(t)] : null));
      }
    }

    // Consensus series.
    const consensusHourly = { smart: [], raw: [], temp: [], fz: [], wind: [], gust: [] };
    for (let i = 0; i < time.length; i++) {
      for (const k of Object.keys(consensusHourly)) consensusHourly[k].push(r2(median(models.map(m => m.hourly[k][i]))));
    }
    const dates = ref.daily.map(d => d.date);
    const consensusDaily = dates.map(date => {
      const per = models.map(m => m.daily.find(d => d.date === date)).filter(Boolean);
      return {
        date,
        smart: summarize(per.map(d => d.smart)),
        raw: summarize(per.map(d => d.raw)),
        tmin: round1(median(per.map(d => d.tmin))),
        tmax: round1(median(per.map(d => d.tmax))),
        gust: round1(median(per.map(d => d.gust))),
        fz: per.some(d => d.fz != null) ? Math.round(median(per.map(d => d.fz))) : null,
      };
    });
    const consensusWindows = {};
    for (const k of Object.keys(WINDOWS)) {
      consensusWindows[k] = { smart: summarize(models.map(m => m.windows[k].smart)), raw: summarize(models.map(m => m.windows[k].raw)) };
    }

    const order = Object.keys(MODELS);
    models.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    return {
      generatedAt: new Date().toISOString(),
      timezone: ref._tz, utcOffset: ref._off, gridElevation: ref._gridElev,
      time, nowIndex: time.findIndex(t => t >= nowHour()),
      models: models.map(({ _time, _off, _tz, _gridElev, ...m }) => m),
      unavailable: errors,
      consensus: { hourly: consensusHourly, daily: consensusDaily, windows: consensusWindows },
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Ensembles: probabilistic snowfall from 4 systems / ~143 members
// ---------------------------------------------------------------------------------------------
function weightedQuantile(pairs, q) {
  // pairs: [value, weight] sorted by value
  const total = pairs.reduce((a, p) => a + p[1], 0);
  let acc = 0;
  for (const [v, w] of pairs) { acc += w; if (acc >= q * total) return v; }
  return pairs.length ? pairs[pairs.length - 1][0] : null;
}

async function getEnsemble(point, mode = 'smart') {
  const key = `ens:${point.lat},${point.lon},${point.elev}:${mode}`;
  return cached(key, 60 * 60e3, async () => {
    const qs = `latitude=${point.lat}&longitude=${point.lon}&elevation=${point.elev}` +
      `&hourly=snowfall,precipitation,temperature_2m&models=${Object.keys(ENSEMBLES).join(',')}` +
      `&forecast_days=16&timezone=auto&timeformat=unixtime`;
    const j = await fetchJSON(`${HOST.ensemble}?${withKey(qs)}`, { timeout: 45000 });
    const h = j.hourly, time = h.time, off = j.utc_offset_seconds || 0;
    const t0 = nowHour();
    const start = Math.max(0, time.findIndex(t => t >= t0));

    // Group member series: key format `<var>[_memberNN]_<suffix>`
    const systems = {};
    for (const k of Object.keys(h)) {
      const m = k.match(/^(snowfall|precipitation|temperature_2m)(?:_member(\d+))?_(.+)$/);
      if (!m) continue;
      const [, v, mem = '00', suffix] = m;
      systems[suffix] ??= {};
      systems[suffix][mem] ??= {};
      systems[suffix][mem][v] = h[k];
    }
    const suffixToId = s => (/gefs|gfs/.test(s) ? 'gfs025' : /ecmwf/.test(s) ? 'ecmwf_ifs025' : /icon/.test(s) ? 'icon_seamless' : /gem/.test(s) ? 'gem_global' : s);

    const out = [];
    for (const [suffix, members] of Object.entries(systems)) {
      // Cumulative smart snow from now for each member, null past that member's horizon.
      const series = Object.values(members).map(mv => {
        let acc = 0, alive = true;
        return time.slice(start).map((_, k) => {
          const i = start + k;
          if (!alive) return null;
          if (mv.precipitation?.[i] == null && mv.snowfall?.[i] == null) { alive = false; return null; }
          acc += (mode === 'raw' ? mv.snowfall?.[i] : smartSnowCm(mv.snowfall?.[i], mv.precipitation?.[i], mv.temperature_2m?.[i])) || 0;
          return acc;
        });
      }).filter(s => s[0] != null);
      if (!series.length) continue;
      const id = suffixToId(suffix);
      const meta = ENSEMBLES[id] || { name: suffix, org: '' };
      const n = series[0].length;
      const pct = { p10: [], p25: [], p50: [], p75: [], p90: [] };
      let horizon = 0;
      for (let k = 0; k < n; k++) {
        const vals = series.map(s => s[k]).filter(v => v != null).sort((a, b) => a - b);
        if (vals.length < series.length * 0.8) { for (const p of Object.keys(pct)) pct[p].push(null); continue; }
        horizon = k;
        pct.p10.push(r2(quantile(vals, 0.1))); pct.p25.push(r2(quantile(vals, 0.25))); pct.p50.push(r2(quantile(vals, 0.5)));
        pct.p75.push(r2(quantile(vals, 0.75))); pct.p90.push(r2(quantile(vals, 0.9)));
      }
      const totalsAt = hrs => (hrs <= horizon ? series.map(s => s[Math.min(hrs, n - 1)]).filter(v => v != null).map(r2).sort((a, b) => a - b) : null);
      out.push({
        id, suffix, name: meta.name, org: meta.org, members: series.length, horizonHours: horizon,
        cumulative: pct,
        totals: { next24: totalsAt(24), next72: totalsAt(72), next7d: totalsAt(168), next10d: totalsAt(240), next15d: totalsAt(359) },
        _series: series,
      });
    }
    if (!out.length) throw new Error('Ensemble returned no members');

    // Grand ensemble: each system weighted equally regardless of member count.
    const n = out[0]._series[0].length;
    const grand = { p10: [], p50: [], p90: [] };
    for (let k = 0; k < n; k++) {
      const pairs = [];
      const live = out.filter(s => s.cumulative.p50[k] != null);
      for (const s of live) for (const ser of s._series) if (ser[k] != null) pairs.push([ser[k], 1 / s._series.length / live.length]);
      pairs.sort((a, b) => a[0] - b[0]);
      grand.p10.push(r2(weightedQuantile(pairs, 0.1))); grand.p50.push(r2(weightedQuantile(pairs, 0.5))); grand.p90.push(r2(weightedQuantile(pairs, 0.9)));
    }

    return {
      generatedAt: new Date().toISOString(), timezone: j.timezone, utcOffset: off,
      time: time.slice(start),
      systems: out.map(({ _series, ...s }) => s),
      grand,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Current conditions + recent history (best-match blend) for one point
// ---------------------------------------------------------------------------------------------
const CURRENT = 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,wind_direction_10m,snowfall,precipitation,snow_depth,freezing_level_height,is_day';

async function getCurrent(point) {
  const key = `cur:${point.lat},${point.lon},${point.elev}`;
  return cached(key, 15 * 60e3, async () => {
    const qs = `latitude=${point.lat}&longitude=${point.lon}&elevation=${point.elev}&current=${CURRENT}` +
      `&daily=snowfall_sum,precipitation_sum,temperature_2m_max,temperature_2m_min,wind_gusts_10m_max,sunrise,sunset` +
      `&hourly=snow_depth,visibility&past_days=14&forecast_days=2&timezone=auto`;
    const j = await fetchJSON(`${HOST.forecast}?${withKey(qs)}`);
    const today = j.current.time.slice(0, 10);
    const di = j.daily.time.indexOf(today);
    const hi = j.hourly.time.findIndex(t => t >= j.current.time.slice(0, 13));
    return {
      timezone: j.timezone, utcOffset: j.utc_offset_seconds, gridElevation: j.elevation,
      current: { ...j.current, visibility: hi >= 0 ? j.hourly.visibility[hi] : null },
      sunrise: j.daily.sunrise[di], sunset: j.daily.sunset[di],
      history: j.daily.time.map((d, i) => ({
        date: d, snow: j.daily.snowfall_sum[i], precip: j.daily.precipitation_sum[i],
        tmax: j.daily.temperature_2m_max[i], tmin: j.daily.temperature_2m_min[i], gust: j.daily.wind_gusts_10m_max[i],
      })).filter(d => d.date < today),
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Dashboard overview: every resort, 3-model blend (ECMWF + GFS + ICON), mid-mountain
// ---------------------------------------------------------------------------------------------
const OVERVIEW_MODELS = ['ecmwf_ifs025', 'gfs_seamless', 'icon_seamless'];

async function overviewChunk(pts) {
  const lat = pts.map(p => p.lat).join(','), lon = pts.map(p => p.lon).join(','), elev = pts.map(p => p.elev).join(',');
  const base = `latitude=${lat}&longitude=${lon}&elevation=${elev}&timezone=auto&timeformat=unixtime`;
  const [fc, cur] = await Promise.all([
    fetchJSON(`${HOST.forecast}?${withKey(`${base}&hourly=snowfall,precipitation,temperature_2m&models=${OVERVIEW_MODELS.join(',')}&past_days=2&forecast_days=11`)}`, { timeout: 45000 }),
    fetchJSON(`${HOST.forecast}?${withKey(`${base}&current=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,snow_depth,is_day`)}`, { timeout: 30000 }),
  ]);
  const fcs = Array.isArray(fc) ? fc : [fc];
  const curs = Array.isArray(cur) ? cur : [cur];
  const t0 = nowHour();
  return pts.map((p, i) => {
    const j = fcs[i], h = j.hourly, off = j.utc_offset_seconds || 0, time = h.time;
    const perModel = OVERVIEW_MODELS.map(m => {
      const raw = h[`snowfall_${m}`] || [], pr = h[`precipitation_${m}`] || [], tp = h[`temperature_2m_${m}`] || [];
      const smart = time.map((_, k) => (pr[k] == null && raw[k] == null ? null : smartSnowCm(raw[k], pr[k], tp[k])));
      return { smart, raw: raw.map((v, k) => (smart[k] == null ? null : v || 0)) };
    }).filter(m => m.smart.some(v => v != null));
    const win = {};
    for (const [k, [a, b]] of Object.entries(WINDOWS)) {
      if (k === 'next16d') continue;
      win[k] = {
        smart: summarize(perModel.map(m => windowSum(time, m.smart, t0 + a * 3600, t0 + b * 3600))),
        raw: summarize(perModel.map(m => windowSum(time, m.raw, t0 + a * 3600, t0 + b * 3600))),
      };
    }
    // Daily (local) consensus for the next 10 days.
    const todayLocal = localDate(t0, off);
    const dayMap = new Map();
    time.forEach((t, k) => {
      const d = localDate(t, off);
      if (d < todayLocal) return;
      if (!dayMap.has(d)) dayMap.set(d, perModel.map(() => ({ s: 0, r: 0, n: 0 })));
      perModel.forEach((m, mi) => { if (m.smart[k] != null) { const c = dayMap.get(d)[mi]; c.s += m.smart[k]; c.r += m.raw[k]; c.n++; } });
    });
    const daily = [...dayMap.entries()].slice(0, 10).map(([date, arr]) => {
      const okArr = arr.filter(c => c.n >= 18 || (date === todayLocal && c.n > 0));
      return { date, smart: r2(median(okArr.map(c => c.s))), raw: r2(median(okArr.map(c => c.r))) };
    });
    const c = curs[i]?.current || {};
    return {
      id: p.id, elev: p.elev, timezone: j.timezone,
      current: { time: c.time, temp: c.temperature_2m, code: c.weather_code, wind: c.wind_speed_10m, gust: c.wind_gusts_10m, snowDepth: c.snow_depth, isDay: c.is_day },
      windows: win, daily,
    };
  });
}

async function getOverview(resorts) {
  return cached('overview', 60 * 60e3, async () => {
    const pts = resorts.map(r => ({ id: r.id, lat: r.lat, lon: r.lon, elev: Math.round((r.base + r.summit) / 2) }));
    const chunks = [];
    for (let i = 0; i < pts.length; i += 25) chunks.push(pts.slice(i, i + 25));
    const results = [];
    for (const ch of chunks) results.push(...(await overviewChunk(ch))); // sequential: be polite to the free API
    return { generatedAt: new Date().toISOString(), models: OVERVIEW_MODELS.map(id => MODELS[id].name), resorts: results };
  });
}

async function geocode(q) {
  // Accept raw "lat, lon" so backcountry peaks / unlisted hills can be added.
  const ll = /^s*(-?d{1,2}(?:.d+)?)s*[, ]s*(-?d{1,3}(?:.d+)?)s*$/.exec(q);
  if (ll) {
    const lat = +ll[1], lon = +ll[2];
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return [];
    const e = await fetchJSON(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
    return [{ name: `${lat.toFixed(3)}, ${lon.toFixed(3)}`, admin: 'Coordinates', country: '', lat, lon, elevation: e.elevation?.[0] ?? 0 }];
  }
  return cached(`geo:${q.toLowerCase()}`, 24 * 3600e3, async () => {
    const j = await fetchJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`);
    return (j.results || []).map(r => ({ name: r.name, admin: [r.admin1, r.country].filter(Boolean).join(', '), country: r.country_code, lat: r.latitude, lon: r.longitude, elevation: r.elevation }));
  });
}

module.exports = { MODELS, ENSEMBLES, modelsFor, getMultiModel, getEnsemble, getCurrent, getOverview, geocode };
