interface Entry<T> {
  value: T;
  storedAt: number;
}

export interface CachePolicy {
  /** Serve from cache without refreshing for this long. */
  freshMs: number;
  /** After that, keep serving the old value (refreshing in the background) for this long. */
  staleMs: number;
}

export interface CacheResult<T> {
  value: T;
  state: 'hit' | 'stale' | 'miss';
}

/**
 * In-memory stale-while-revalidate cache with request coalescing: concurrent misses for the same key share
 * one upstream call, and a failed background refresh keeps serving the previous value.
 */
export class SwrCache {
  private readonly entries = new Map<string, Entry<unknown>>();
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(private readonly maxEntries = 1000) {}

  async get<T>(key: string, policy: CachePolicy, load: () => Promise<T>): Promise<CacheResult<T>> {
    const entry = this.entries.get(key) as Entry<T> | undefined;
    const age = entry ? Date.now() - entry.storedAt : Infinity;

    if (entry && age < policy.freshMs) return { value: entry.value, state: 'hit' };
    if (entry && age < policy.freshMs + policy.staleMs) {
      this.refresh(key, load).catch(() => undefined);
      return { value: entry.value, state: 'stale' };
    }
    return { value: await this.refresh(key, load), state: 'miss' };
  }

  get size(): number {
    return this.entries.size;
  }

  private refresh<T>(key: string, load: () => Promise<T>): Promise<T> {
    const pending = this.inflight.get(key) as Promise<T> | undefined;
    if (pending) return pending;
    const p = load()
      .then(value => {
        this.entries.delete(key); // re-insert to keep Map order = recency
        this.entries.set(key, { value, storedAt: Date.now() });
        this.evict();
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  private evict() {
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Freshness tuned to how often each source actually changes. */
export const POLICIES = {
  overview: { freshMs: 2 * HOUR, staleMs: 22 * HOUR },
  multiModel: { freshMs: 1 * HOUR, staleMs: 11 * HOUR },
  ensemble: { freshMs: 3 * HOUR, staleMs: 9 * HOUR },
  current: { freshMs: 20 * MIN, staleMs: 3 * HOUR },
  nws: { freshMs: 30 * MIN, staleMs: 6 * HOUR },
  nwsPoint: { freshMs: 7 * 24 * HOUR, staleMs: 7 * 24 * HOUR },
  discussion: { freshMs: 1 * HOUR, staleMs: 12 * HOUR },
  alerts: { freshMs: 10 * MIN, staleMs: 1 * HOUR },
  snotelStations: { freshMs: 24 * HOUR, staleMs: 7 * 24 * HOUR },
  snotelData: { freshMs: 1 * HOUR, staleMs: 12 * HOUR },
  avalanche: { freshMs: 30 * MIN, staleMs: 6 * HOUR },
  geocode: { freshMs: 24 * HOUR, staleMs: 7 * 24 * HOUR },
} satisfies Record<string, CachePolicy>;
