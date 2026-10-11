/**
 * Snow physics: turns model precipitation into ski-relevant snowfall at a chosen elevation.
 *
 * Models report precipitation for a grid cell whose elevation is often hundreds of metres below a
 * summit. We instead use the 2 m temperature that Open-Meteo downscales to the elevation being forecast:
 *
 *   snow water = precipitation × snowFraction(T)        (rain/snow split at *this* elevation)
 *   snow depth = snow water × ratio                      (ratio: temperature-based, or fixed 10:1)
 */
import type { BySnowMode } from './types';

/** The conventional reference snow-to-liquid ratio. */
export const FIXED_RATIO = 10;

/** Fraction of precipitation falling as snow at 2 m temperature `t` (°C). */
export function snowFraction(t: number | null | undefined): number {
  if (t == null) return 0;
  if (t <= -0.5) return 1;
  if (t >= 2.5) return 0;
  return (2.5 - t) / 3;
}

/**
 * Snow-to-liquid ratio by surface temperature (°C): ~8:1 near freezing, peaking around 17:1 in
 * cold storms and easing in very cold air where crystals are small. Loosely follows the
 * climatologies in Roebber et al. (2003) and Baxter et al. (2005).
 */
const RATIO_CURVE: readonly (readonly [number, number])[] = [
  [2, 6],
  [0, 8.5],
  [-2, 10],
  [-4, 12],
  [-6, 13.5],
  [-8, 15],
  [-11, 16.5],
  [-14, 17.5],
  [-18, 16],
  [-25, 14],
];

export function snowRatio(t: number | null | undefined): number {
  if (t == null) return FIXED_RATIO;
  const first = RATIO_CURVE[0]!;
  if (t >= first[0]) return first[1];
  for (let i = 1; i < RATIO_CURVE.length; i++) {
    const [t1, r1] = RATIO_CURVE[i - 1]!;
    const [t2, r2] = RATIO_CURVE[i]!;
    if (t >= t2) return r1 + ((t - t1) / (t2 - t1)) * (r2 - r1);
  }
  return RATIO_CURVE.at(-1)![1];
}

/** Snowfall (cm) for one hour under both ratio modes; null when the model has no data that hour. */
export function hourlySnow(
  precipMm: number | null | undefined,
  tempC: number | null | undefined,
): BySnowMode<number | null> {
  if (precipMm == null) return { auto: null, fixed: null };
  const water = precipMm * snowFraction(tempC);
  if (water <= 0) return { auto: 0, fixed: 0 };
  return { auto: (water * snowRatio(tempC)) / 10, fixed: (water * FIXED_RATIO) / 10 };
}
