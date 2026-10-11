const path = require('path');
const express = require('express');
const compression = require('compression');

const om = require('./lib/openmeteo');
const { getNws } = require('./lib/nws');
const { getSnotel } = require('./lib/snotel');
const { getAvalanche } = require('./lib/avalanche');
const { resorts, season } = (() => {
  const j = require('./data/resorts.json');
  return { resorts: j.resorts, season: j.season };
})();

const app = express();
app.disable('x-powered-by');
app.use(compression());

// Resolve an Ikon resort id, or a custom spot encoded as `custom~lat~lon~elevM~name`.
function resolve(id) {
  const r = resorts.find(x => x.id === id);
  if (r) return r;
  const m = /^custom~(-?\d+(?:\.\d+)?)~(-?\d+(?:\.\d+)?)~(-?\d+)~(.{1,80})$/.exec(id);
  if (m) {
    const lat = +m[1], lon = +m[2], elev = +m[3];
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180 || elev < -500 || elev > 9000) return null;
    return { id, custom: true, name: decodeURIComponent(m[4]), region: 'Custom spot', country: '', lat, lon, base: elev, summit: elev };
  }
  return null;
}

// Pick the elevation the forecast is downscaled to: base | mid | summit | <meters>.
function pointFor(r, elevParam) {
  let elev;
  if (elevParam === 'base') elev = r.base;
  else if (elevParam === 'summit') elev = r.summit;
  else if (/^\d+$/.test(elevParam || '')) elev = Math.min(9000, +elevParam);
  else elev = Math.round((r.base + r.summit) / 2);
  return { lat: +r.lat.toFixed(4), lon: +r.lon.toFixed(4), elev };
}

const isUS = r => r.country === 'US' || (r.custom && r.lat > 18 && r.lat < 72 && r.lon < -65 && r.lon > -170);

// Wrap async handlers with consistent errors + cache headers.
const route = (maxAge, fn) => async (req, res) => {
  try {
    const out = await fn(req, res);
    if (out === undefined) return;
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    res.json(out);
  } catch (err) {
    console.error(`[${req.method} ${req.originalUrl}]`, err.message);
    res.status(err.status === 404 ? 404 : 502).json({ error: err.message });
  }
};

const withResort = fn => async (req, res) => {
  const r = resolve(req.params.id);
  if (!r) { res.status(404).json({ error: 'Unknown resort' }); return undefined; }
  return fn(r, req, res);
};

app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.get('/api/resorts', route(3600, () => ({ season, resorts })));

app.get('/api/models', route(3600, () => ({ deterministic: om.MODELS, ensembles: om.ENSEMBLES })));

app.get('/api/overview', route(300, () => om.getOverview(resorts)));

app.get('/api/resort/:id/forecast', route(300, withResort(async (r, req) => {
  const pt = pointFor(r, req.query.elev);
  return { resort: r, point: pt, ...(await om.getMultiModel(pt)) };
})));

app.get('/api/resort/:id/current', route(300, withResort(async (r, req) => {
  const pt = pointFor(r, req.query.elev);
  return { point: pt, ...(await om.getCurrent(pt)) };
})));

app.get('/api/resort/:id/ensemble', route(600, withResort(async (r, req) => {
  const pt = pointFor(r, req.query.elev);
  return { point: pt, ...(await om.getEnsemble(pt, req.query.mode === 'raw' ? 'raw' : 'smart')) };
})));

app.get('/api/resort/:id/nws', route(600, withResort(async r => {
  if (!isUS(r)) return { available: false, reason: 'NWS covers US locations only' };
  return { available: true, ...(await getNws(r)) };
})));

app.get('/api/resort/:id/snotel', route(1800, withResort(async r => {
  if (!isUS(r)) return { available: false, reason: 'SNOTEL is a US network' };
  return { available: true, ...(await getSnotel(r)) };
})));

app.get('/api/resort/:id/avalanche', route(900, withResort(async r => {
  if (!isUS(r)) return { available: false, reason: 'avalanche.org covers US avalanche centers' };
  return { available: true, forecast: await getAvalanche(r) };
})));

app.get('/api/geocode', route(3600, async req => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return { results: [] };
  return { results: await om.geocode(q.slice(0, 80)) };
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '5m', extensions: ['html'] }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ikon Snow listening on :${PORT} — ${resorts.length} destinations loaded`);
  // Warm the dashboard cache so the first visitor doesn't wait (Render free instances cold-start).
  om.getOverview(resorts).then(() => console.log('Overview cache warmed')).catch(e => console.warn('Overview warm failed:', e.message));
  getSnotel(resorts.find(r => r.id === 'alta')).catch(() => {}); // loads + caches the SNOTEL station list
});
