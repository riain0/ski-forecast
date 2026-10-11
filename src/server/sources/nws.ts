/** US National Weather Service: human forecast, gridded snowfall and snow level, discussion, alerts. */
import { UpstreamError } from '#shared/errors';
import type { GeoPoint, NwsForecast } from '#shared/types';
import { POLICIES } from '../cache';
import { cachedJson, type SourceContext } from './context';

const API = 'https://api.weather.gov';

interface PointsResponse {
  properties: { cwa: string; forecast: string; forecastGridData: string; timeZone: string };
}
interface TimeValue {
  validTime: string;
  value: number | null;
}
interface GridResponse {
  properties: {
    updateTime?: string;
    elevation?: { value: number };
    snowfallAmount?: { values: TimeValue[] };
    snowLevel?: { values: TimeValue[] };
  };
}
interface ForecastResponse {
  properties: {
    updateTime?: string;
    periods: {
      name: string;
      startTime: string;
      isDaytime: boolean;
      temperature: number;
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
      detailedForecast: string;
      probabilityOfPrecipitation?: { value: number | null };
    }[];
  };
}
interface AlertsResponse {
  features: {
    properties: {
      event: string;
      headline: string | null;
      severity: string;
      description: string;
      instruction: string | null;
      ends: string | null;
      expires: string | null;
    };
  }[];
}
interface ProductList {
  '@graph'?: { id: string }[];
}
interface Product {
  issuanceTime: string;
  productText: string;
}

/** "2026-10-10T15:00:00+00:00/PT6H" → start (ms) and duration (h). */
export function parseValidTime(validTime: string): { start: number; hours: number } {
  const [iso = '', duration = ''] = validTime.split('/');
  const m = /P(?:(\d+)D)?(?:T(?:(\d+)H)?)?/.exec(duration);
  const hours = Number(m?.[1] ?? 0) * 24 + Number(m?.[2] ?? 0) || 1;
  return { start: Date.parse(iso), hours };
}

const dayFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });

/** Spreads interval totals evenly over their hours, then sums per local calendar day. */
export function dailyTotals(values: TimeValue[], timeZone: string): { date: string; value: number }[] {
  const fmt = dayFormatter(timeZone);
  const days = new Map<string, number>();
  for (const { validTime, value } of values) {
    if (value == null) continue;
    const { start, hours } = parseValidTime(validTime);
    for (let h = 0; h < hours; h++) {
      const date = fmt.format(new Date(start + h * 3_600_000));
      days.set(date, (days.get(date) ?? 0) + value / hours);
    }
  }
  return [...days].map(([date, value]) => ({ date, value }));
}

function dailyRange(values: TimeValue[], timeZone: string) {
  const fmt = dayFormatter(timeZone);
  const days = new Map<string, { min: number; max: number }>();
  for (const { validTime, value } of values) {
    if (value == null) continue;
    const date = fmt.format(new Date(parseValidTime(validTime).start));
    const cur = days.get(date) ?? { min: Infinity, max: -Infinity };
    days.set(date, { min: Math.min(cur.min, value), max: Math.max(cur.max, value) });
  }
  return [...days].map(([date, r]) => ({ date, min: Math.round(r.min), max: Math.round(r.max) }));
}

/** Returns null when the point is outside NWS coverage. */
export async function getNwsForecast(ctx: SourceContext, p: GeoPoint): Promise<NwsForecast | null> {
  let point: PointsResponse;
  try {
    point = await cachedJson<PointsResponse>(
      ctx,
      `${API}/points/${p.lat.toFixed(4)},${p.lon.toFixed(4)}`,
      POLICIES.nwsPoint,
    );
  } catch (err) {
    if (err instanceof UpstreamError && err.status === 404) return null;
    throw err;
  }
  const { cwa, forecast, forecastGridData, timeZone } = point.properties;

  const [fc, grid, discussion, alerts] = await Promise.allSettled([
    cachedJson<ForecastResponse>(ctx, forecast, POLICIES.nws),
    cachedJson<GridResponse>(ctx, forecastGridData, POLICIES.nws, 30_000),
    getDiscussion(ctx, cwa),
    cachedJson<AlertsResponse>(
      ctx,
      `${API}/alerts/active?point=${p.lat.toFixed(4)},${p.lon.toFixed(4)}`,
      POLICIES.alerts,
    ),
  ]);
  if (fc.status === 'rejected' && grid.status === 'rejected') throw fc.reason;

  const g = grid.status === 'fulfilled' ? grid.value.properties : undefined;
  return {
    office: cwa,
    officeUrl: `https://www.weather.gov/${cwa.toLowerCase()}/`,
    timeZone,
    updatedAt: fc.status === 'fulfilled' ? (fc.value.properties.updateTime ?? null) : null,
    gridElevation: g?.elevation?.value ?? null,
    periods:
      fc.status === 'fulfilled'
        ? fc.value.properties.periods.map(x => ({
            name: x.name,
            start: x.startTime,
            isDaytime: x.isDaytime,
            temperatureF: x.temperature,
            wind: `${x.windSpeed} ${x.windDirection}`,
            summary: x.shortForecast,
            detail: x.detailedForecast,
            precipChance: x.probabilityOfPrecipitation?.value ?? null,
          }))
        : [],
    snowDaily: dailyTotals(g?.snowfallAmount?.values ?? [], timeZone).map(d => ({
      date: d.date,
      cm: Math.round(d.value) / 10,
    })),
    snowLevel: dailyRange(g?.snowLevel?.values ?? [], timeZone),
    discussion: discussion.status === 'fulfilled' ? discussion.value : null,
    alerts:
      alerts.status === 'fulfilled'
        ? alerts.value.features.map(({ properties: a }) => ({
            event: a.event,
            headline: a.headline ?? a.event,
            severity: a.severity,
            description: a.description,
            instruction: a.instruction,
            ends: a.ends ?? a.expires,
          }))
        : [],
  };
}

async function getDiscussion(ctx: SourceContext, cwa: string) {
  const list = await cachedJson<ProductList>(
    ctx,
    `${API}/products/types/AFD/locations/${cwa}`,
    POLICIES.discussion,
  );
  const latest = list['@graph']?.[0];
  if (!latest) return null;
  const product = await cachedJson<Product>(ctx, `${API}/products/${latest.id}`, POLICIES.discussion);
  return { issuedAt: product.issuanceTime, text: product.productText };
}
