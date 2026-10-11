// Shared HTTP + caching helpers.
const UA = process.env.CONTACT_EMAIL
  ? `ikon-snow/1.0 (${process.env.CONTACT_EMAIL})`
  : 'ikon-snow/1.0 (https://github.com/ - personal ski forecast app)';

const store = new Map(); // key -> { value, expires }
const inflight = new Map(); // key -> Promise

// Returns a cached value, or runs fn() once (even under concurrent requests) and caches it.
async function cached(key, ttlMs, fn) {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    try {
      const value = await fn();
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    } catch (err) {
      // Serve stale data rather than failing when an upstream hiccups.
      if (hit) return hit.value;
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

// Evict expired entries periodically so memory stays bounded on small instances.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (v.expires < now - 6 * 3600e3) store.delete(k);
}, 15 * 60e3).unref();

// Per-host concurrency limits: Open-Meteo's free tier rejects bursts of parallel requests.
const LIMITS = { 'open-meteo.com': 3, default: 6 };
const active = new Map(); // host -> count
const queues = new Map(); // host -> [resolve]
function limitFor(host) {
  const k = Object.keys(LIMITS).find(d => host.endsWith(d));
  return [k || 'default', LIMITS[k || 'default']];
}
async function acquire(host) {
  const [k, max] = limitFor(host);
  if ((active.get(k) || 0) >= max) await new Promise(r => { if (!queues.has(k)) queues.set(k, []); queues.get(k).push(r); });
  active.set(k, (active.get(k) || 0) + 1);
  return () => {
    active.set(k, active.get(k) - 1);
    const next = queues.get(k)?.shift();
    if (next) next();
  };
}

async function fetchJSON(url, { timeout = 20000, headers = {}, retries = 2 } = {}) {
  let lastErr;
  const host = new URL(url).host;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const release = await acquire(host);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json, application/geo+json', ...headers },
        signal: AbortSignal.timeout(timeout),
      });
      const text = await res.text();
      let body;
      try { body = JSON.parse(text); } catch { body = null; }
      if (!res.ok) {
        const reason = (body && (body.reason || body.detail || body.title)) || text.slice(0, 200);
        const err = new Error(`HTTP ${res.status}: ${reason}`);
        err.status = res.status;
        err.reason = reason;
        throw err;
      }
      if (body === null) throw new Error('Invalid JSON from ' + new URL(url).host);
      return body;
    } catch (err) {
      lastErr = err;
      // Don't retry client errors (e.g. "no data for this location"), except rate limiting.
      const rateLimited = err.status === 429 || /too many/i.test(err.message);
      if (err.status && err.status >= 400 && err.status < 500 && !rateLimited) break;
      if (attempt < retries) await new Promise(r => setTimeout(r, (rateLimited ? 1500 : 600) * (attempt + 1)));
    } finally {
      release();
    }
  }
  throw lastErr;
}

module.exports = { cached, fetchJSON, UA };
