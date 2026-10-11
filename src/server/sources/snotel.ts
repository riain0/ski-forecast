/** USDA NRCS SNOTEL: measured snow depth, snow water equivalent and temperature at automated stations. */
import type { GeoPoint, SnotelReading, SnotelStation } from '#shared/types';
import { POLICIES } from '../cache';
import { cachedJson, haversineKm, type SourceContext } from './context';

const AWDB = 'https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1';

interface StationMeta {
  stationTriplet: string;
  networkCode: string;
  name: string;
  stateCode: string;
  latitude: number;
  longitude: number;
  elevation: number;
}
interface StationData {
  stationTriplet: string;
  data?: { stationElement: { elementCode: string }; values: { date: string; value: number | null }[] }[];
}

const inchesToCm = (v: number | null) => (v == null ? null : Math.round(v * 25.4) / 10);
const fToC = (v: number | null) => (v == null ? null : Math.round(((v - 32) * 50) / 9) / 10);
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function stations(ctx: SourceContext) {
  const list = await cachedJson<StationMeta[]>(
    ctx,
    `${AWDB}/stations?networkCds=SNTL&activeOnly=true`,
    POLICIES.snotelStations,
    45_000,
  );
  // The API ignores the network filter in some versions, so filter again here.
  return list.filter(s => s.networkCode === 'SNTL');
}

/** Change in depth over `days`; a lower bound on new snow because the pack settles. */
function depthChange(series: SnotelReading[], days: number): number | null {
  const withDepth = series.filter(r => r.depth != null);
  if (withDepth.length < days + 1) return null;
  const a = withDepth.at(-1 - days)!.depth!;
  const b = withDepth.at(-1)!.depth!;
  return Math.round((b - a) * 10) / 10;
}

export async function getSnotel(
  ctx: SourceContext,
  p: GeoPoint,
  maxKm = 45,
  count = 3,
): Promise<SnotelStation[]> {
  const near = (await stations(ctx))
    .map(s => ({ s, km: haversineKm(p, { lat: s.latitude, lon: s.longitude }) }))
    .filter(x => x.km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
  if (near.length === 0) return [];

  const triplets = near.map(x => x.s.stationTriplet).join(',');
  const now = Date.now();
  const data = await cachedJson<StationData[]>(
    ctx,
    `${AWDB}/data?stationTriplets=${triplets}&elements=SNWD,WTEQ,TOBS&duration=DAILY&beginDate=${isoDay(now - 20 * 86_400_000)}&endDate=${isoDay(now)}`,
    POLICIES.snotelData,
    30_000,
  );

  return near.map(({ s, km }) => {
    const d = data.find(x => x.stationTriplet === s.stationTriplet);
    const element = (code: string) => d?.data?.find(e => e.stationElement.elementCode === code)?.values ?? [];
    const depth = element('SNWD');
    const swe = element('WTEQ');
    const temp = element('TOBS');
    const valueOn = (values: { date: string; value: number | null }[], date: string) =>
      values.find(v => v.date === date)?.value ?? null;
    const dates = [...new Set([...depth, ...swe, ...temp].map(v => v.date))].sort();
    const series: SnotelReading[] = dates.map(date => ({
      date,
      depth: inchesToCm(valueOn(depth, date)),
      swe: inchesToCm(valueOn(swe, date)),
      temp: fToC(valueOn(temp, date)),
    }));
    const latest = series.findLast(r => r.depth != null || r.swe != null) ?? null;
    return {
      id: s.stationTriplet,
      name: s.name,
      state: s.stateCode,
      distanceKm: Math.round(km * 10) / 10,
      elevation: Math.round(s.elevation * 0.3048),
      url: `https://wcc.sc.egov.usda.gov/nwcc/site?sitenum=${s.stationTriplet.split(':')[0] ?? ''}`,
      latest,
      change24: depthChange(series, 1),
      change72: depthChange(series, 3),
      series,
    };
  });
}
