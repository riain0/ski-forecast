/**
 * End-to-end smoke test against live upstream APIs.
 *   npm run smoke                                    # boots dist/server on a spare port
 *   BASE_URL=https://ikon-snow.onrender.com npm run smoke
 */
import { spawn, type ChildProcess } from 'node:child_process';

const port = 3900 + Math.floor(Math.random() * 90);
const base = process.env.BASE_URL ?? `http://localhost:${port}`;
let server: ChildProcess | undefined;

if (!process.env.BASE_URL) {
  server = spawn(process.execPath, ['dist/server/index.js'], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'inherit',
  });
}

type Check = [path: string, ok: (body: unknown, status: number) => boolean];
const alta = 'lat=40.588&lon=-111.639';
const checks: Check[] = [
  ['/api/health', b => (b as { ok: boolean }).ok],
  ['/api/overview', b => (b as { entries: unknown[] }).entries.length > 80],
  [`/api/forecast?${alta}&elevation=3216`, b => (b as { models: unknown[] }).models.length >= 8],
  [`/api/ensemble?${alta}&elevation=3216`, b => (b as { systems: unknown[] }).systems.length >= 3],
  [`/api/current?${alta}&elevation=3216`, b => typeof (b as { temp: unknown }).temp === 'number'],
  [`/api/nws?${alta}&country=US`, b => (b as { available: boolean }).available],
  [`/api/snotel?${alta}&country=US`, b => (b as { available: boolean }).available],
  [`/api/avalanche?${alta}&country=US`, b => (b as { available: boolean }).available],
  ['/api/nws?lat=46.02&lon=7.75&country=CH', b => !(b as { available: boolean }).available],
  ['/api/geocode?q=Whistler', b => (b as unknown[]).length > 0],
  ['/api/forecast?lat=999&lon=0&elevation=0', (_b, status) => status === 400],
  ['/mountain/alta', (_b, status) => status === 200],
];

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server at ${base} did not start`);
}

async function main() {
  await waitForServer();
  let failed = 0;
  for (const [path, ok] of checks) {
    const started = Date.now();
    try {
      const res = await fetch(base + path);
      const isJson = res.headers.get('content-type')?.includes('json') ?? false;
      const body: unknown = isJson ? await res.json() : await res.text();
      const pass = ok(body, res.status);
      if (!pass) failed++;
      const note = pass ? (res.headers.get('x-cache') ?? '') : JSON.stringify(body).slice(0, 200);
      console.info(`${pass ? 'PASS' : 'FAIL'}  ${res.status}  ${path}  ${Date.now() - started} ms  ${note}`);
    } catch (err) {
      failed++;
      console.info(`FAIL  ${path}  ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.info(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  return failed;
}

main()
  .then(failed => {
    server?.kill();
    process.exit(failed ? 1 : 0);
  })
  .catch((err: unknown) => {
    console.error(err);
    server?.kill();
    process.exit(1);
  });
