// Smoke test: boots the server on a spare port and checks every API endpoint returns sane data.
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3900 + Math.floor(Math.random() * 90);
const base = `http://localhost:${PORT}`;
const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT }, stdio: 'inherit' });

const checks = [
  ['/api/health', j => j.ok === true],
  ['/api/resorts', j => j.resorts.length > 50],
  ['/api/overview', j => j.resorts.length > 50 && j.resorts.every(r => r.windows.next72)],
  ['/api/resort/alta/forecast?elev=summit', j => j.models.length >= 8 && j.consensus.daily.length > 10],
  ['/api/resort/zermatt/forecast', j => j.models.length >= 6],
  ['/api/resort/alta/ensemble', j => j.systems.length >= 3 && j.grand.p50.length > 100],
  ['/api/resort/alta/current', j => typeof j.current.temperature_2m === 'number'],
  ['/api/resort/alta/nws', j => j.available && j.periods?.length > 0],
  ['/api/resort/alta/snotel', j => j.available && j.stations.length > 0],
  ['/api/resort/alta/avalanche', j => j.available && j.forecast?.center],
  ['/api/resort/niseko/nws', j => j.available === false],
  ['/api/geocode?q=Whistler', j => j.results.length > 0],
  ['/api/resort/nope/forecast', (j, s) => s === 404],
];

(async () => {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base + '/api/health')).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  let failed = 0;
  for (const [p, ok] of checks) {
    const t = Date.now();
    try {
      const res = await fetch(base + p);
      const j = await res.json();
      const pass = ok(j, res.status);
      if (!pass) failed++;
      console.log(`${pass ? 'PASS' : 'FAIL'}  ${p}  (${Date.now() - t} ms)${pass ? '' : '  ' + JSON.stringify(j).slice(0, 200)}`);
    } catch (e) { failed++; console.log(`FAIL  ${p}  ${e.message}`); }
  }
  srv.kill();
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})();
