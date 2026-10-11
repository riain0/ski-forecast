import { RateLimitedError, UpstreamError, rateLimitResetAt } from '#shared/errors';
import type { JsonFetcher } from '#shared/openmeteo/client';

interface HostPolicy {
  /** Max simultaneous requests. Open-Meteo rejects bursts from one IP. */
  concurrency: number;
}

const POLICIES: Record<string, HostPolicy> = {
  'open-meteo.com': { concurrency: 2 },
};
const DEFAULT_POLICY: HostPolicy = { concurrency: 6 };

/** Groups hosts that share a quota (all *.open-meteo.com APIs count against one limit). */
const groupOf = (host: string) => Object.keys(POLICIES).find(suffix => host.endsWith(suffix)) ?? host;

class Semaphore {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) await new Promise<void>(resolve => this.waiting.push(resolve));
    this.active++;
    try {
      return await task();
    } finally {
      this.active--;
      this.waiting.shift()?.();
    }
  }
}

export interface Cooldown {
  until: number;
  reason: string;
}

/**
 * Creates the server's JSON fetcher. After a rate-limit response it stops calling that host until the
 * limit resets, throwing `RateLimitedError` immediately; retrying would only burn more quota.
 */
export function createFetcher(userAgent: string) {
  const semaphores = new Map<string, Semaphore>();
  const cooldowns = new Map<string, Cooldown>();

  const semaphoreFor = (group: string) => {
    let s = semaphores.get(group);
    if (!s) {
      s = new Semaphore((POLICIES[group] ?? DEFAULT_POLICY).concurrency);
      semaphores.set(group, s);
    }
    return s;
  };

  const fetchJson: JsonFetcher = async (url, { timeoutMs = 20_000 } = {}) => {
    const { host } = new URL(url);
    const group = groupOf(host);

    for (let attempt = 0; ; attempt++) {
      const cooldown = cooldowns.get(group);
      if (cooldown && cooldown.until > Date.now())
        throw new RateLimitedError(group, cooldown.until, cooldown.reason);
      try {
        return await semaphoreFor(group).run(async () => {
          const res = await fetch(url, {
            headers: { 'User-Agent': userAgent, Accept: 'application/json, application/geo+json' },
            signal: AbortSignal.timeout(timeoutMs),
          });
          const body: unknown = await res.json().catch(() => null);
          if (!res.ok) {
            const reason = extractReason(body) ?? `HTTP ${res.status}`;
            throw new UpstreamError(host, res.status, reason);
          }
          if (body === null) throw new UpstreamError(host, res.status, 'Invalid JSON');
          return body;
        });
      } catch (err) {
        if (err instanceof UpstreamError && err.rateLimited) {
          const until = rateLimitResetAt(err.message);
          cooldowns.set(group, { until, reason: err.message });
          console.warn(
            `[upstream] ${group} rate limited until ${new Date(until).toISOString()}: ${err.message}`,
          );
          throw new RateLimitedError(group, until, err.message);
        }
        const clientError = err instanceof UpstreamError && err.status >= 400 && err.status < 500;
        if (clientError || attempt >= 1) throw err;
        await new Promise(r => setTimeout(r, 750));
      }
    }
  };

  const status = () =>
    Object.fromEntries([...cooldowns].filter(([, c]) => c.until > Date.now()).map(([g, c]) => [g, c]));

  return { fetchJson, status };
}

function extractReason(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  for (const key of ['reason', 'detail', 'title', 'message']) {
    if (typeof b[key] === 'string') return b[key];
  }
  return null;
}
