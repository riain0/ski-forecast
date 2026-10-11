import { median } from './stats';
import type { Series } from './types';

/**
 * Consensus accumulation. Each step adds the change in the median measured over the same set of models at
 * both ends, so short-range models dropping out never makes the line jump or dip.
 */
export function consensusAccumulation(series: Series[]): Series {
  const length = Math.max(0, ...series.map(s => s.length));
  const out: Series = [];
  for (let i = 0; i < length; i++) {
    const alive = series.filter(s => s[i] != null);
    if (alive.length === 0) {
      out.push(null);
      continue;
    }
    if (i === 0) {
      out.push(median(alive.map(s => s[0])));
      continue;
    }
    const both = alive.filter(s => s[i - 1] != null);
    const step = both.length
      ? Math.max(0, (median(both.map(s => s[i])) ?? 0) - (median(both.map(s => s[i - 1])) ?? 0))
      : 0;
    out.push((out[i - 1] ?? 0) + step);
  }
  return out;
}
