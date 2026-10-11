/** Avalanche danger from avalanche.org (US avalanche centers), matched to a point by forecast zone. */
import type { AvalancheRating, GeoPoint } from '#shared/types';
import { POLICIES } from '../cache';
import { cachedJson, haversineKm, type SourceContext } from './context';

type Ring = [number, number][];
interface Feature {
  geometry: { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] } | null;
  properties: {
    name: string;
    center: string;
    link?: string;
    center_link?: string;
    danger_level: number;
    travel_advice?: string;
    off_season?: boolean;
  };
}

const LABELS = ['No rating', 'Low', 'Moderate', 'Considerable', 'High', 'Extreme'] as const;

function polygons(f: Feature): Ring[][] {
  if (!f.geometry) return [];
  return f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
}

/** Ray-casting point-in-ring test; `pt` is [lon, lat]. */
export function inRing(pt: [number, number], ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const contains = (f: Feature, pt: [number, number]) =>
  polygons(f).some(([outer, ...holes]) => !!outer && inRing(pt, outer) && !holes.some(h => inRing(pt, h)));

const distanceKm = (f: Feature, p: GeoPoint) =>
  Math.min(
    ...polygons(f).flatMap(([outer]) => (outer ?? []).map(([lon, lat]) => haversineKm(p, { lat, lon }))),
  );

export async function getAvalanche(ctx: SourceContext, p: GeoPoint): Promise<AvalancheRating | null> {
  const fc = await cachedJson<{ features: Feature[] }>(
    ctx,
    'https://api.avalanche.org/v2/public/products/map-layer',
    POLICIES.avalanche,
    30_000,
  );
  let feature = fc.features.find(f => contains(f, [p.lon, p.lat]));
  let nearestZoneOnly = false;
  if (!feature) {
    // Many resorts sit just outside a zone polygon; accept the nearest zone within 30 km.
    const nearest = fc.features
      .map(f => ({ f, km: distanceKm(f, p) }))
      .filter(x => x.km < 30)
      .sort((a, b) => a.km - b.km)[0];
    feature = nearest?.f;
    nearestZoneOnly = !!nearest;
  }
  if (!feature) return null;
  const { properties: z } = feature;
  const level = z.danger_level >= 1 && z.danger_level <= 5 ? z.danger_level : null;
  return {
    center: z.center,
    zone: z.name,
    link: z.link ?? z.center_link ?? 'https://avalanche.org',
    level,
    label: LABELS[level ?? 0] ?? 'No rating',
    travelAdvice: z.travel_advice ?? '',
    offSeason: !!z.off_season,
    nearestZoneOnly,
  };
}
