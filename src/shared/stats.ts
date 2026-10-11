import type { Stat } from './types';

const isNum = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);

export function median(values: readonly (number | null | undefined)[]): number | null {
  const a = values.filter(isNum).sort((x, y) => x - y);
  if (a.length === 0) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid]! : (a[mid - 1]! + a[mid]!) / 2;
}

/** Linear-interpolated quantile of an ascending-sorted array. */
export function quantile(sorted: readonly number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/** Quantile of [value, weight] pairs sorted by value. */
export function weightedQuantile(pairs: readonly (readonly [number, number])[], q: number): number | null {
  if (pairs.length === 0) return null;
  const total = pairs.reduce((sum, [, w]) => sum + w, 0);
  let acc = 0;
  for (const [value, weight] of pairs) {
    acc += weight;
    if (acc >= q * total) return value;
  }
  return pairs.at(-1)![0];
}

export function summarize(values: readonly (number | null | undefined)[]): Stat | null {
  const v = values.filter(isNum);
  if (v.length === 0) return null;
  return {
    median: round(median(v)!, 2),
    mean: round(v.reduce((a, b) => a + b, 0) / v.length, 2),
    min: round(Math.min(...v), 2),
    max: round(Math.max(...v), 2),
    n: v.length,
  };
}

export function round(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export const roundOrNull = (value: number | null | undefined, digits = 1): number | null =>
  isNum(value) ? round(value, digits) : null;

export { isNum };
