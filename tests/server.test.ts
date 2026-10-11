import { afterEach, describe, expect, it, vi } from 'vitest';
import { cacheControl } from '../src/server/app';
import { SwrCache } from '../src/server/cache';
import { createFetcher } from '../src/server/http';
import { inRing } from '../src/server/sources/avalanche';
import { dailyTotals, parseValidTime } from '../src/server/sources/nws';
import { RateLimitedError, rateLimitResetAt } from '../src/shared/errors';

describe('rateLimitResetAt', () => {
  const now = Date.UTC(2026, 9, 11, 18, 30);
  it('waits until just after midnight UTC for daily limits', () => {
    expect(rateLimitResetAt('Daily API request limit exceeded', now)).toBe(Date.UTC(2026, 9, 12, 0, 1));
  });
  it('waits until the next hour for hourly limits', () => {
    expect(rateLimitResetAt('Hourly API request limit exceeded', now)).toBe(Date.UTC(2026, 9, 11, 19, 1));
  });
  it('waits about a minute for minutely limits', () => {
    expect(rateLimitResetAt('Minutely API request limit exceeded', now)).toBe(now + 65_000);
  });
});

describe('createFetcher', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('enters a cooldown after a rate limit and stops calling upstream', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ error: true, reason: 'Daily API request limit exceeded' }, { status: 429 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { fetchJson, status } = createFetcher('test');
    await expect(fetchJson('https://api.open-meteo.com/v1/forecast')).rejects.toBeInstanceOf(
      RateLimitedError,
    );
    await expect(fetchJson('https://ensemble-api.open-meteo.com/v1/ensemble')).rejects.toBeInstanceOf(
      RateLimitedError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(Object.keys(status())).toEqual(['open-meteo.com']);
  });

  it('does not retry client errors', async () => {
    const fetchMock = vi.fn(async () => Response.json({ reason: 'No data' }, { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchJson } = createFetcher('test');
    await expect(fetchJson('https://api.open-meteo.com/v1/forecast')).rejects.toThrow('No data');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('SwrCache', () => {
  it('coalesces concurrent misses into one load', async () => {
    const cache = new SwrCache();
    const load = vi.fn(async () => 42);
    const policy = { freshMs: 1000, staleMs: 1000 };
    const [a, b] = await Promise.all([cache.get('k', policy, load), cache.get('k', policy, load)]);
    expect(a.value).toBe(42);
    expect(b.value).toBe(42);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('serves stale values while refreshing, and keeps them if the refresh fails', async () => {
    vi.useFakeTimers();
    const cache = new SwrCache();
    const policy = { freshMs: 1000, staleMs: 10_000 };
    await cache.get('k', policy, async () => 'old');
    vi.advanceTimersByTime(2000);
    const stale = await cache.get('k', policy, () => Promise.reject(new Error('upstream down')));
    expect(stale).toMatchObject({ value: 'old', state: 'stale', ageMs: 2000 });
    await vi.runAllTimersAsync();
    expect((await cache.get('k', policy, async () => 'new')).value).toBe('old');
    vi.useRealTimers();
  });

  it('evicts the least recently stored entries beyond its size', async () => {
    const cache = new SwrCache(2);
    const policy = { freshMs: 60_000, staleMs: 0 };
    await cache.get('a', policy, async () => 1);
    await cache.get('b', policy, async () => 2);
    await cache.get('c', policy, async () => 3);
    expect(cache.size).toBe(2);
  });
});

describe('NWS helpers', () => {
  it('parses ISO-8601 interval durations', () => {
    expect(parseValidTime('2026-10-10T15:00:00+00:00/PT6H')).toEqual({
      start: Date.UTC(2026, 9, 10, 15),
      hours: 6,
    });
    expect(parseValidTime('2026-10-10T00:00:00+00:00/P1DT12H').hours).toBe(36);
  });

  it('spreads interval totals across local days', () => {
    const days = dailyTotals([{ validTime: '2026-10-10T22:00:00+00:00/PT4H', value: 40 }], 'UTC');
    expect(days).toEqual([
      { date: '2026-10-10', value: 20 },
      { date: '2026-10-11', value: 20 },
    ]);
  });
});

describe('avalanche zone lookup', () => {
  const square: [number, number][] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ];
  it('detects points inside and outside a ring', () => {
    expect(inRing([5, 5], square)).toBe(true);
    expect(inRing([15, 5], square)).toBe(false);
  });
});

describe('cacheControl', () => {
  const policy = { freshMs: 2 * 3600_000, staleMs: 10 * 3600_000 };
  it('lets clients reuse a fresh value for the rest of its server freshness', () => {
    expect(cacheControl(policy, { state: 'hit', ageMs: 3600_000 })).toBe(
      'public, max-age=3600, stale-while-revalidate=36000',
    );
  });
  it('asks clients to check back soon while a stale value is refreshing', () => {
    expect(cacheControl(policy, { state: 'stale', ageMs: 3 * 3600_000 })).toMatch(/^public, max-age=60,/);
  });
});
