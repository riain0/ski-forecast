// Snow math: elevation-aware rain/snow partitioning and temperature-based snow-to-liquid ratios.
//
// Open-Meteo's `snowfall` assumes a fixed ~7:1 snow-to-liquid ratio (SLR) and is computed at the
// model grid-cell elevation, which is often hundreds of meters below a ski area's summit. That
// under-forecasts mountain snow in two ways: (1) precip falling as rain in the valley-elevation
// grid cell is snow up top, (2) cold storms produce fluffier snow than 7:1.
//
// "Smart" snow fixes both using the temperature downscaled to the requested elevation:
//   snow water  = max(model snow water, total precip * snowFraction(T))
//   snow depth  = snow water * SLR(T)

const OM_SLR = 7; // Open-Meteo: 7 cm snow == 10 mm water -> 0.7 cm/mm

// Fraction of precipitation falling as snow, by 2 m temperature (°C).
function snowFraction(t) {
  if (t == null) return 0;
  if (t <= -0.5) return 1;
  if (t >= 2.5) return 0;
  return (2.5 - t) / 3;
}

// Snow-to-liquid ratio by surface temperature (°C). Loosely follows climatological
// SLR studies (e.g. Roebber et al. 2003, Baxter et al. 2005): ~8:1 near freezing,
// rising to ~16-18:1 in cold storms, tapering slightly in very cold air (small crystals).
const SLR_TABLE = [
  [2, 6], [0, 8.5], [-2, 10], [-4, 12], [-6, 13.5], [-8, 15], [-11, 16.5], [-14, 17.5], [-18, 16], [-25, 14],
];
function slr(t) {
  if (t == null) return 10;
  if (t >= SLR_TABLE[0][0]) return SLR_TABLE[0][1];
  for (let i = 1; i < SLR_TABLE.length; i++) {
    const [t1, r1] = SLR_TABLE[i - 1];
    const [t2, r2] = SLR_TABLE[i];
    if (t >= t2) return r1 + ((t - t1) / (t2 - t1)) * (r2 - r1);
  }
  return SLR_TABLE[SLR_TABLE.length - 1][1];
}

// Returns smart snowfall in cm for one hour.
function smartSnowCm(modelSnowCm, precipMm, tempC) {
  if (modelSnowCm == null && precipMm == null) return null;
  const modelWater = (modelSnowCm || 0) * (10 / OM_SLR); // mm
  const partitioned = (precipMm || 0) * snowFraction(tempC);
  const water = Math.max(modelWater, partitioned);
  if (water <= 0) return 0;
  return (water * slr(tempC)) / 10; // mm water * ratio = mm snow -> /10 = cm
}

const median = arr => {
  const a = arr.filter(v => v != null && !Number.isNaN(v)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const round1 = v => (v == null ? null : Math.round(v * 10) / 10);

module.exports = { smartSnowCm, snowFraction, slr, median, quantile, round1 };
