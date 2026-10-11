/**
 * Pure transforms from raw Open-Meteo JSON to domain types. No I/O, so they run identically on the
 * server and in the browser, and are easy to unit test.
 */
import { ENSEMBLES, modelInfo } from '../models';
import { hourlySnow } from '../snow';
import { median, round, roundOrNull, summarize, weightedQuantile } from '../stats';
import { currentHour, localDate } from '../time';
import type {
  BySnowMode,
  ConsensusDay,
  CurrentConditions,
  EnsembleForecast,
  EnsembleSystem,
  EnsembleWindow,
  ForecastPoint,
  ForecastWindow,
  ModelDay,
  ModelRun,
  MultiModelForecast,
  OverviewEntry,
  OverviewWindow,
  Percentiles,
  Series,
  SnowMode,
} from '../types';

// ---------------------------------------------------------------------------------------------
// Raw response shape (only the parts we read)
// ---------------------------------------------------------------------------------------------

export interface OmResponse {
  timezone: string;
  utc_offset_seconds: number;
  elevation: number;
  hourly?: Record<string, Series> & { time?: number[] };
  current?: Record<string, number | string>;
  daily?: Record<string, (number | string | null)[]>;
}

export function asOmResponse(json: unknown): OmResponse {
  if (typeof json !== 'object' || json === null || typeof (json as OmResponse).timezone !== 'string') {
    throw new Error('Unexpected Open-Meteo response');
  }
  return json as OmResponse;
}

export const asOmResponses = (json: unknown): OmResponse[] =>
  (Array.isArray(json) ? json : [json]).map(asOmResponse);

const MODES: readonly SnowMode[] = ['auto', 'fixed'];
const r2 = (v: number | null) => roundOrNull(v, 2);
const mapModes = <T>(fn: (mode: SnowMode) => T): BySnowMode<T> => ({ auto: fn('auto'), fixed: fn('fixed') });

/**
 * Sums `values` over hours in [from, to). Null if any hour is missing or the series doesn't reach `to`,
 * so a model never reports a misleadingly small total past the end of its range.
 */
export function windowSum(time: readonly number[], values: Series, from: number, to: number): number | null {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < time.length; i++) {
    const t = time[i]!;
    if (t < from || t >= to) continue;
    const v = values[i];
    if (v == null) return null;
    sum += v;
    count++;
  }
  return count >= Math.round((to - from) / 3600) * 0.95 ? sum : null;
}

function seriesOf(hourly: Record<string, Series>, variable: string, model: string): Series {
  return hourly[`${variable}_${model}`] ?? hourly[variable] ?? [];
}

const snowSeries = (precip: Series, temp: Series): BySnowMode<Series> => {
  const out: BySnowMode<Series> = { auto: [], fixed: [] };
  precip.forEach((p, i) => {
    const s = hourlySnow(p, temp[i]);
    out.auto.push(s.auto);
    out.fixed.push(s.fixed);
  });
  return out;
};

// ---------------------------------------------------------------------------------------------
// Deterministic multi-model
// ---------------------------------------------------------------------------------------------

const FORECAST_WINDOWS: Record<ForecastWindow, number> = {
  next24: 24,
  next48: 48,
  next72: 72,
  next5d: 120,
  next7d: 168,
  next10d: 240,
  next16d: 372,
};

export interface ModelBatchResult {
  models: string[];
  response: OmResponse;
}

function buildModelRun(
  id: string,
  time: readonly number[],
  utcOffset: number,
  hourly: Record<string, Series>,
  now: number,
): ModelRun | null {
  const align = (s: Series) => time.map((_, i) => s[i] ?? null);
  const precip = align(seriesOf(hourly, 'precipitation', id));
  if (!precip.some(v => v != null)) return null;
  const temp = align(seriesOf(hourly, 'temperature_2m', id));
  const freezingLevel = align(seriesOf(hourly, 'freezing_level_height', id));
  const wind = align(seriesOf(hourly, 'wind_speed_10m', id));
  const gust = align(seriesOf(hourly, 'wind_gusts_10m', id));
  const snow = snowSeries(precip, temp);
  const last = precip.findLastIndex(v => v != null);

  // Group hours into resort-local calendar days.
  const byDay = new Map<string, number[]>();
  time.forEach((t, i) => {
    const d = localDate(t, utcOffset);
    const list = byDay.get(d) ?? [];
    list.push(i);
    byDay.set(d, list);
  });
  const daily: ModelDay[] = [...byDay].map(([date, idx]) => {
    const have = idx.filter(i => precip[i] != null);
    const complete = idx.length >= 20 && have.length >= idx.length * 0.75;
    const sum = (s: Series) => (complete ? r2(have.reduce((a, i) => a + (s[i] ?? 0), 0)) : null);
    const temps = idx.map(i => temp[i]).filter((v): v is number => v != null);
    const gusts = idx.map(i => gust[i]).filter((v): v is number => v != null);
    return {
      date,
      complete,
      snow: mapModes(m => sum(snow[m])),
      precip: sum(precip),
      tmin: temps.length ? round(Math.min(...temps)) : null,
      tmax: temps.length ? round(Math.max(...temps)) : null,
      gust: gusts.length ? round(Math.max(...gusts)) : null,
      freezingLevel: roundOrNull(median(idx.map(i => freezingLevel[i])), 0),
    };
  });

  const windows = Object.fromEntries(
    Object.entries(FORECAST_WINDOWS).map(([k, hours]) => [
      k,
      mapModes(m => r2(windowSum(time, snow[m], now, now + hours * 3600))),
    ]),
  ) as Record<ForecastWindow, BySnowMode<number | null>>;

  const info = modelInfo(id) ?? { id, name: id, agency: '', resolution: '', note: '' };
  return {
    ...info,
    horizonHours: Math.max(0, Math.round((time[last]! - now) / 3600)),
    windows,
    daily,
    hourly: {
      snow: mapModes(m => snow[m].map(r2)),
      precip: precip.map(r2),
      temp: temp.map(v => roundOrNull(v)),
      freezingLevel: freezingLevel.map(v => roundOrNull(v, 0)),
      wind: wind.map(v => roundOrNull(v)),
      gust: gust.map(v => roundOrNull(v)),
    },
  };
}

export function processMultiModel(
  point: ForecastPoint,
  batches: ModelBatchResult[],
  unavailable: { id: string; reason: string }[] = [],
  nowMs = Date.now(),
): MultiModelForecast {
  if (batches.length === 0) throw new Error('No model data');
  const now = currentHour(nowMs);
  // The longest batch defines the shared time axis; shorter batches start at the same hour.
  const master = batches.reduce((a, b) =>
    (b.response.hourly?.time?.length ?? 0) > (a.response.hourly?.time?.length ?? 0) ? b : a,
  ).response;
  const time = master.hourly?.time ?? [];
  const utcOffset = master.utc_offset_seconds;

  const models: ModelRun[] = [];
  const missing = [...unavailable];
  for (const { models: ids, response } of batches) {
    const raw = response.hourly ?? {};
    const index = new Map((raw.time ?? []).map((t, i) => [t, i]));
    const aligned: Record<string, Series> = {};
    for (const [key, values] of Object.entries(raw)) {
      if (key === 'time') continue;
      aligned[key] = time.map(t => {
        const i = index.get(t);
        return i === undefined ? null : (values[i] ?? null);
      });
    }
    for (const id of ids) {
      const run = buildModelRun(id, time, utcOffset, aligned, now);
      if (run) models.push(run);
      else missing.push({ id, reason: 'No data for this location' });
    }
  }
  if (models.length === 0) throw new Error('No forecast model returned data for this location');

  const at = (pick: (m: ModelRun) => Series, i: number) => models.map(m => pick(m)[i]);
  const consensusHourly = {
    snow: mapModes(mode => time.map((_, i) => r2(median(at(m => m.hourly.snow[mode], i))))),
    temp: time.map((_, i) => roundOrNull(median(at(m => m.hourly.temp, i)))),
    tempMin: time.map((_, i) => minOf(at(m => m.hourly.temp, i))),
    tempMax: time.map((_, i) => maxOf(at(m => m.hourly.temp, i))),
    freezingLevel: time.map((_, i) => roundOrNull(median(at(m => m.hourly.freezingLevel, i)), 0)),
    wind: time.map((_, i) => roundOrNull(median(at(m => m.hourly.wind, i)))),
    gust: time.map((_, i) => roundOrNull(median(at(m => m.hourly.gust, i)))),
  };

  const dates = [...new Set(time.map(t => localDate(t, utcOffset)))];
  const daily: ConsensusDay[] = dates.map(date => {
    const days = models.map(m => m.daily.find(d => d.date === date)).filter((d): d is ModelDay => !!d);
    return {
      date,
      snow: mapModes(m => summarize(days.map(d => d.snow[m]))),
      tmin: roundOrNull(median(days.map(d => d.tmin))),
      tmax: roundOrNull(median(days.map(d => d.tmax))),
      gust: roundOrNull(median(days.map(d => d.gust))),
      freezingLevel: roundOrNull(median(days.map(d => d.freezingLevel)), 0),
    };
  });

  const windows = Object.fromEntries(
    (Object.keys(FORECAST_WINDOWS) as ForecastWindow[]).map(k => [
      k,
      mapModes(m => summarize(models.map(run => run.windows[k][m]))),
    ]),
  ) as MultiModelForecast['consensus']['windows'];

  return {
    generatedAt: new Date(nowMs).toISOString(),
    point,
    timezone: master.timezone,
    utcOffset,
    gridElevation: master.elevation,
    time,
    nowIndex: Math.max(
      0,
      time.findIndex(t => t >= now),
    ),
    models,
    unavailable: missing,
    consensus: { hourly: consensusHourly, daily, windows },
  };
}

function minOf(values: (number | null | undefined)[]): number | null {
  const v = values.filter((x): x is number => x != null);
  return v.length ? Math.min(...v) : null;
}
function maxOf(values: (number | null | undefined)[]): number | null {
  const v = values.filter((x): x is number => x != null);
  return v.length ? Math.max(...v) : null;
}

// ---------------------------------------------------------------------------------------------
// Ensembles
// ---------------------------------------------------------------------------------------------

const ENSEMBLE_WINDOWS: Record<EnsembleWindow, number> = {
  next24: 24,
  next72: 72,
  next7d: 168,
  next10d: 240,
  next14d: 336,
};

interface MemberSeries {
  precipitation?: Series;
  temperature_2m?: Series;
}

/** Cumulative snowfall from `start`, null once the member runs out of data. */
function accumulate(member: MemberSeries, start: number, length: number, mode: SnowMode): Series {
  const out: Series = [];
  let total = 0;
  let alive = true;
  for (let k = 0; k < length; k++) {
    const i = start + k;
    const p = member.precipitation?.[i];
    if (!alive || p == null) {
      alive = false;
      out.push(null);
      continue;
    }
    total += hourlySnow(p, member.temperature_2m?.[i])[mode] ?? 0;
    out.push(total);
  }
  return out;
}

export function processEnsemble(
  point: ForecastPoint,
  response: OmResponse,
  nowMs = Date.now(),
): EnsembleForecast {
  const hourly = response.hourly ?? {};
  const time = hourly.time ?? [];
  const start = Math.max(
    0,
    time.findIndex(t => t >= currentHour(nowMs)),
  );
  const length = time.length - start;

  // Keys look like `precipitation_member07_ncep_gefs025`; the control run has no member segment.
  const grouped = new Map<string, Map<string, MemberSeries>>();
  for (const [key, values] of Object.entries(hourly)) {
    const m = /^(precipitation|temperature_2m)(?:_member(\d+))?_(.+)$/.exec(key);
    if (!m) continue;
    const [, variable, member = '00', suffix] = m as unknown as [
      string,
      keyof MemberSeries,
      string | undefined,
      string,
    ];
    const system = grouped.get(suffix) ?? new Map<string, MemberSeries>();
    const series = system.get(member) ?? {};
    series[variable] = values;
    system.set(member, series);
    grouped.set(suffix, system);
  }

  const systems: (EnsembleSystem & { cumulative: BySnowMode<Series[]> })[] = [];
  for (const [suffix, members] of grouped) {
    const meta = ENSEMBLES.find(e => e.match.test(suffix));
    const cumulative = mapModes(mode =>
      [...members.values()].map(s => accumulate(s, start, length, mode)).filter(s => s[0] != null),
    );
    const count = cumulative.auto.length;
    if (count === 0) continue;
    let horizon = 0;
    for (let k = 0; k < length; k++) {
      if (cumulative.auto.filter(s => s[k] != null).length >= count * 0.8) horizon = k;
    }
    const totals = mapModes(mode =>
      Object.fromEntries(
        Object.entries(ENSEMBLE_WINDOWS).map(([w, hours]) => {
          const idx = hours - 1;
          if (idx > horizon) return [w, null];
          return [
            w,
            cumulative[mode]
              .map(s => s[idx])
              .filter((v): v is number => v != null)
              .map(v => round(v, 2))
              .sort((a, b) => a - b),
          ];
        }),
      ),
    ) as EnsembleSystem['totals'];
    systems.push({
      id: meta?.id ?? suffix,
      name: meta?.name ?? suffix,
      agency: meta?.agency ?? '',
      members: count,
      horizonHours: horizon,
      totals,
      cumulative,
    });
  }
  if (systems.length === 0) throw new Error('Ensemble returned no members');

  // Grand ensemble: every system gets equal weight regardless of member count.
  const grand = mapModes<Percentiles>(mode => {
    const out: Percentiles = { p10: [], p50: [], p90: [] };
    for (let k = 0; k < length; k++) {
      const live = systems.filter(s => k <= s.horizonHours);
      const pairs: [number, number][] = [];
      for (const s of live) {
        const series = s.cumulative[mode];
        for (const m of series) {
          const v = m[k];
          if (v != null) pairs.push([v, 1 / series.length / live.length]);
        }
      }
      pairs.sort((a, b) => a[0] - b[0]);
      out.p10.push(r2(weightedQuantile(pairs, 0.1)));
      out.p50.push(r2(weightedQuantile(pairs, 0.5)));
      out.p90.push(r2(weightedQuantile(pairs, 0.9)));
    }
    return out;
  });

  return {
    generatedAt: new Date(nowMs).toISOString(),
    point,
    timezone: response.timezone,
    utcOffset: response.utc_offset_seconds,
    time: time.slice(start),
    systems: systems.map(({ cumulative, ...s }) => s),
    grand,
  };
}

// ---------------------------------------------------------------------------------------------
// Current conditions
// ---------------------------------------------------------------------------------------------

export function processCurrent(point: ForecastPoint, r: OmResponse): CurrentConditions {
  const c = r.current ?? {};
  const num = (k: string): number => Number(c[k] ?? Number.NaN);
  const observedAt = String(c.time ?? '');
  const today = observedAt.slice(0, 10);
  const d = r.daily ?? {};
  const dates = (d.time ?? []) as string[];
  const todayIdx = dates.indexOf(today);
  const fz = c.freezing_level_height;
  return {
    point,
    timezone: r.timezone,
    utcOffset: r.utc_offset_seconds,
    observedAt,
    temp: num('temperature_2m'),
    feelsLike: num('apparent_temperature'),
    humidity: num('relative_humidity_2m'),
    weatherCode: num('weather_code'),
    cloudCover: num('cloud_cover'),
    windSpeed: num('wind_speed_10m'),
    windGust: num('wind_gusts_10m'),
    windDirection: num('wind_direction_10m'),
    freezingLevel: typeof fz === 'number' ? fz : null,
    isDay: c.is_day === 1,
    sunrise: todayIdx >= 0 ? ((d.sunrise?.[todayIdx] as string | null) ?? null) : null,
    sunset: todayIdx >= 0 ? ((d.sunset?.[todayIdx] as string | null) ?? null) : null,
    history: dates
      .map((date, i) => ({
        date,
        snow: Number(d.snowfall_sum?.[i] ?? 0),
        tmax: (d.temperature_2m_max?.[i] as number | null | undefined) ?? null,
        tmin: (d.temperature_2m_min?.[i] as number | null | undefined) ?? null,
      }))
      .filter(h => h.date < today),
  };
}

// ---------------------------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------------------------

const OVERVIEW_WINDOWS: Record<OverviewWindow, [number, number]> = {
  past24: [-24, 0],
  past48: [-48, 0],
  next24: [0, 24],
  next72: [0, 72],
  next7d: [0, 168],
  next10d: [0, 240],
};

export function processOverviewEntry(
  id: string,
  elevation: number,
  r: OmResponse,
  models: readonly string[],
  nowMs = Date.now(),
): OverviewEntry {
  const hourly = r.hourly ?? {};
  const time = hourly.time ?? [];
  const now = currentHour(nowMs);
  const runs = models
    .map(m => snowSeries(seriesOf(hourly, 'precipitation', m), seriesOf(hourly, 'temperature_2m', m)))
    .filter(s => s.auto.some(v => v != null));

  const windows = Object.fromEntries(
    Object.entries(OVERVIEW_WINDOWS).map(([k, [a, b]]) => [
      k,
      mapModes(mode => summarize(runs.map(s => windowSum(time, s[mode], now + a * 3600, now + b * 3600)))),
    ]),
  ) as OverviewEntry['windows'];

  const today = localDate(now, r.utc_offset_seconds);
  const byDay = new Map<string, number[]>();
  time.forEach((t, i) => {
    const d = localDate(t, r.utc_offset_seconds);
    if (d < today) return;
    byDay.set(d, [...(byDay.get(d) ?? []), i]);
  });
  const daily = [...byDay].slice(0, 10).map(([date, idx]) => ({
    date,
    snow: mapModes(mode =>
      r2(
        median(
          runs.map(s => {
            const have = idx.filter(i => s[mode][i] != null);
            if (have.length < 18 && !(date === today && have.length > 0)) return null;
            return have.reduce((a, i) => a + (s[mode][i] ?? 0), 0);
          }),
        ),
      ),
    ),
  }));

  const c = r.current ?? {};
  const n = (k: string) => (typeof c[k] === 'number' ? c[k] : null);
  return {
    id,
    elevation,
    timezone: r.timezone,
    now: {
      temp: n('temperature_2m'),
      weatherCode: n('weather_code'),
      wind: n('wind_speed_10m'),
      isDay: c.is_day === 1,
    },
    windows,
    daily,
  };
}

export { MODES };
