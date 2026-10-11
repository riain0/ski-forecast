import { describe, expect, it } from 'vitest';
import { FIXED_RATIO, hourlySnow, snowFraction, snowRatio } from '../src/shared/snow';

describe('snowFraction', () => {
  it('is all snow when cold and all rain when warm', () => {
    expect(snowFraction(-5)).toBe(1);
    expect(snowFraction(-0.5)).toBe(1);
    expect(snowFraction(2.5)).toBe(0);
    expect(snowFraction(10)).toBe(0);
  });

  it('mixes linearly between -0.5 and 2.5 °C', () => {
    expect(snowFraction(1)).toBeCloseTo(0.5);
  });

  it('treats missing temperature as no snow', () => {
    expect(snowFraction(null)).toBe(0);
  });
});

describe('snowRatio', () => {
  it('is dense near freezing and fluffy in cold storms', () => {
    expect(snowRatio(0)).toBeCloseTo(8.5);
    expect(snowRatio(-14)).toBeCloseTo(17.5);
    expect(snowRatio(-4)).toBeGreaterThan(snowRatio(-1));
  });

  it('interpolates between curve points', () => {
    expect(snowRatio(-3)).toBeCloseTo(11);
  });

  it('clamps beyond the curve', () => {
    expect(snowRatio(10)).toBe(6);
    expect(snowRatio(-40)).toBe(14);
  });
});

describe('hourlySnow', () => {
  it('returns null when the model has no precipitation value', () => {
    expect(hourlySnow(null, -5)).toEqual({ auto: null, fixed: null });
  });

  it('converts 1 mm of water at -14 °C to 1.75 cm (auto) and 1 cm (10:1)', () => {
    const s = hourlySnow(1, -14);
    expect(s.auto).toBeCloseTo(1.75);
    expect(s.fixed).toBeCloseTo((1 * FIXED_RATIO) / 10);
  });

  it('produces no snow from rain', () => {
    expect(hourlySnow(5, 6)).toEqual({ auto: 0, fixed: 0 });
  });
});
