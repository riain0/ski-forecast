import { describe, expect, it } from 'vitest';
import { consensusAccumulation } from '../src/shared/accumulate';
import {
  processEnsemble,
  processMultiModel,
  processOverviewEntry,
  windowSum,
  type OmResponse,
} from '../src/shared/openmeteo/process';
import type { ForecastPoint } from '../src/shared/types';

const NOW = Date.UTC(2026, 0, 10, 12, 30); // 12:30 UTC; the current hour starts at 12:00
const HOUR0 = Date.UTC(2026, 0, 10, 0) / 1000;
const point: ForecastPoint = { lat: 40.6, lon: -111.6, elevation: 3000 };

const hours = (n: number) => Array.from({ length: n }, (_, i) => HOUR0 + i * 3600);
const constant = (n: number, v: number | null) => Array.from({ length: n }, () => v);

function response(hourly: Record<string, (number | null)[]>, n: number): OmResponse {
  return { timezone: 'UTC', utc_offset_seconds: 0, elevation: 2500, hourly: { time: hours(n), ...hourly } };
}

describe('windowSum', () => {
  const time = hours(48);
  it('sums hours inside the window', () => {
    expect(windowSum(time, constant(48, 1), HOUR0, HOUR0 + 24 * 3600)).toBe(24);
  });
  it('returns null when the series ends before the window does', () => {
    expect(windowSum(time, constant(48, 1), HOUR0, HOUR0 + 72 * 3600)).toBeNull();
  });
  it('returns null when an hour inside the window is missing', () => {
    const values = constant(48, 1);
    values[5] = null;
    expect(windowSum(time, values, HOUR0, HOUR0 + 24 * 3600)).toBeNull();
  });
});

describe('processMultiModel', () => {
  // Long model: 16 days of 1 mm/h at -14 °C (1.75 cm/h auto). Short model: 2 days at -4 °C (1.2 cm/h).
  const long = response(
    {
      precipitation_ecmwf_ifs025: constant(384, 1),
      temperature_2m_ecmwf_ifs025: constant(384, -14),
      precipitation_gfs_seamless: constant(384, 0),
      temperature_2m_gfs_seamless: constant(384, -14),
    },
    384,
  );
  const short = response(
    {
      precipitation_ncep_hrrr_conus: [...constant(48, 1), ...constant(144, null)],
      temperature_2m_ncep_hrrr_conus: constant(192, -4),
    },
    192,
  );
  const result = processMultiModel(
    point,
    [
      { models: ['ecmwf_ifs025', 'gfs_seamless'], response: long },
      { models: ['ncep_hrrr_conus'], response: short },
    ],
    [],
    NOW,
  );

  it('keeps every model with data and reports their horizons', () => {
    expect(result.models.map(m => m.id)).toEqual(['ecmwf_ifs025', 'gfs_seamless', 'ncep_hrrr_conus']);
    expect(result.models.find(m => m.id === 'ncep_hrrr_conus')?.horizonHours).toBe(35);
  });

  it('aligns everything to the longest time axis and finds the current hour', () => {
    expect(result.time).toHaveLength(384);
    expect(result.nowIndex).toBe(12);
  });

  it('computes per-model windows from now, null past a model’s range', () => {
    const ecmwf = result.models.find(m => m.id === 'ecmwf_ifs025')!;
    expect(ecmwf.windows.next24.auto).toBeCloseTo(42);
    expect(ecmwf.windows.next24.fixed).toBeCloseTo(24);
    const hrrr = result.models.find(m => m.id === 'ncep_hrrr_conus')!;
    expect(hrrr.windows.next24.auto).toBeCloseTo(28.8);
    expect(hrrr.windows.next72.auto).toBeNull();
  });

  it('summarizes the consensus across models', () => {
    const w = result.consensus.windows.next24.auto!;
    expect(w.n).toBe(3);
    expect(w.min).toBe(0);
    expect(w.max).toBeCloseTo(42);
    expect(w.median).toBeCloseTo(28.8);
  });

  it('builds complete local days and marks partial coverage', () => {
    const hrrr = result.models.find(m => m.id === 'ncep_hrrr_conus')!;
    expect(hrrr.daily[0]?.complete).toBe(true);
    expect(hrrr.daily[2]?.complete).toBe(false);
    expect(hrrr.daily[2]?.snow.auto).toBeNull();
  });

  it('records models without data as unavailable', () => {
    const r = processMultiModel(
      point,
      [{ models: ['ecmwf_ifs025', 'icon_seamless'], response: long }],
      [],
      NOW,
    );
    expect(r.unavailable.map(u => u.id)).toContain('icon_seamless');
  });
});

describe('processEnsemble', () => {
  const n = 384;
  const members: Record<string, (number | null)[]> = {};
  // GEFS: control + 3 members at 0, 1, 2, 3 mm/h (all cold). ECMWF: 2 members at 1 mm/h.
  [0, 1, 2, 3].forEach((mm, i) => {
    const key = i === 0 ? '' : `_member0${i}`;
    members[`precipitation${key}_ncep_gefs025`] = constant(n, mm);
    members[`temperature_2m${key}_ncep_gefs025`] = constant(n, -14);
  });
  [1, 1].forEach((mm, i) => {
    const key = i === 0 ? '' : `_member0${i}`;
    members[`precipitation${key}_ecmwf_ifs025_ensemble`] = constant(n, mm);
    members[`temperature_2m${key}_ecmwf_ifs025_ensemble`] = constant(n, -14);
  });
  const e = processEnsemble(point, response(members, n), NOW);

  it('groups members by system and names them', () => {
    expect(e.systems.map(s => [s.name, s.members])).toEqual([
      ['GEFS', 4],
      ['ECMWF ENS', 2],
    ]);
  });

  it('starts accumulating at the current hour', () => {
    expect(e.time[0]).toBe(HOUR0 + 12 * 3600);
  });

  it('reports sorted member totals per window', () => {
    const gefs = e.systems[0]!.totals.fixed.next24!;
    expect(gefs).toEqual([0, 24, 48, 72]);
  });

  it('weights systems equally in the grand ensemble', () => {
    // At 24 h the fixed-ratio median lies between GEFS (0–72) and ECMWF (24): 24 cm.
    expect(e.grand.fixed.p50[23]).toBeCloseTo(24);
  });
});

describe('processOverviewEntry', () => {
  it('blends models into past and future windows plus daily totals', () => {
    const n = 13 * 24;
    const r = response(
      {
        precipitation_ecmwf_ifs025: constant(n, 1),
        temperature_2m_ecmwf_ifs025: constant(n, -14),
        precipitation_gfs_seamless: constant(n, 0),
        temperature_2m_gfs_seamless: constant(n, -14),
      },
      n,
    );
    r.current = { temperature_2m: -8, weather_code: 73, wind_speed_10m: 20, is_day: 1 };
    const entry = processOverviewEntry('alta', 2900, r, ['ecmwf_ifs025', 'gfs_seamless'], NOW);
    expect(entry.windows.next24.fixed).toMatchObject({ mean: 12, min: 0, max: 24, n: 2 });
    expect(entry.now).toEqual({ temp: -8, weatherCode: 73, wind: 20, isDay: true });
    expect(entry.daily[0]?.date).toBe('2026-01-10');
  });
});

describe('consensusAccumulation', () => {
  it('never decreases when a short-range model drops out', () => {
    const big = [10, 20, 30, 40, 50];
    const small = [1, 2, 3, null, null];
    const mid = [5, 10, 15, 20, 25];
    const out = consensusAccumulation([big, small, mid]);
    for (let i = 1; i < out.length; i++) expect(out[i]!).toBeGreaterThanOrEqual(out[i - 1]!);
  });

  it('matches the median when every model is present', () => {
    expect(
      consensusAccumulation([
        [1, 2],
        [3, 6],
        [5, 10],
      ]),
    ).toEqual([3, 6]);
  });
});
