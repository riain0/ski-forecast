import type { JsonFetcher } from '#shared/openmeteo/client';
import type { CachePolicy, SwrCache } from '../cache';

export interface SourceContext {
  fetchJson: JsonFetcher;
  cache: SwrCache;
}

/** Cached fetch of a JSON document, cast to the caller's expected shape. */
export async function cachedJson<T>(
  ctx: SourceContext,
  url: string,
  policy: CachePolicy,
  timeoutMs?: number,
): Promise<T> {
  const { value } = await ctx.cache.get(url, policy, () =>
    ctx.fetchJson(url, timeoutMs ? { timeoutMs } : {}),
  );
  return value as T;
}

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}
