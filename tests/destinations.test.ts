import { describe, expect, it } from 'vitest';
import { DESTINATIONS, PASSES } from '../src/shared/destinations';

describe('destinations', () => {
  it('have unique ids', () => {
    const ids = DESTINATIONS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('have plausible coordinates and elevations', () => {
    for (const d of DESTINATIONS) {
      expect(Math.abs(d.lat), d.id).toBeLessThanOrEqual(90);
      expect(Math.abs(d.lon), d.id).toBeLessThanOrEqual(180);
      expect(d.summit, d.id).toBeGreaterThan(d.base);
      expect(d.summit, d.id).toBeLessThan(4500);
    }
  });

  it('only use known passes, each at most once', () => {
    const known = new Set(PASSES.map(p => p.id));
    for (const d of DESTINATIONS) {
      expect(
        d.passes.every(p => known.has(p)),
        d.id,
      ).toBe(true);
      expect(new Set(d.passes).size, d.id).toBe(d.passes.length);
    }
  });

  it('only list pass-less mountains in the US', () => {
    expect(DESTINATIONS.filter(d => d.passes.length === 0).every(d => d.country === 'US')).toBe(true);
  });
});
