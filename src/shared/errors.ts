/** An HTTP failure from an upstream data provider. Thrown by both the server and browser fetchers. */
export class UpstreamError extends Error {
  readonly status: number;
  readonly host: string;

  constructor(host: string, status: number, reason: string) {
    super(reason);
    this.name = 'UpstreamError';
    this.host = host;
    this.status = status;
  }

  get rateLimited(): boolean {
    return this.status === 429 || /too many|limit exceeded/i.test(this.message);
  }
}

/** Thrown without making a request while a host is cooling down after a rate-limit response. */
export class RateLimitedError extends Error {
  readonly retryAt: number;

  constructor(host: string, retryAt: number, reason: string) {
    super(`${host} rate limit: ${reason}`);
    this.name = 'RateLimitedError';
    this.retryAt = retryAt;
  }
}

export const isRateLimit = (err: unknown): boolean =>
  err instanceof RateLimitedError || (err instanceof UpstreamError && err.rateLimited);

/**
 * When a rate limit resets, per Open-Meteo's messages ("Minutely/Hourly/Daily API request limit exceeded").
 * Daily limits reset at midnight UTC.
 */
export function rateLimitResetAt(reason: string, now = Date.now()): number {
  if (/daily/i.test(reason)) {
    const next = new Date(now);
    next.setUTCHours(24, 1, 0, 0);
    return next.getTime();
  }
  if (/hourly/i.test(reason)) return (Math.floor(now / 3_600_000) + 1) * 3_600_000 + 60_000;
  if (/minutely/i.test(reason)) return now + 65_000;
  return now + 5 * 60_000;
}
