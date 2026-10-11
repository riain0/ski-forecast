/* Ikon Snow — client app (vanilla JS, Chart.js, Leaflet) */
(() => {
'use strict';

// ------------------------------------------------------------------------------------------------
// Persistent prefs
// ------------------------------------------------------------------------------------------------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const S = {
  units: store.get('units', 'imperial'),
  snow: store.get('snowMode', 'smart'),
  favs: new Set(store.get('favs', [])),
  spots: store.get('spots', []),
  elev: store.get('elev', 'mid'),
  dash: store.get('dash', { region: 'All', sort: 'next72', dir: -1 }),
  hourlyRange: store.get('hourlyRange', 72),
  mapWin: store.get('mapWin', 'next7d'),
};

// ------------------------------------------------------------------------------------------------
// Formatting / units
// ------------------------------------------------------------------------------------------------
const imp = () => S.units === 'imperial';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const snowVal = cm => (cm == null ? null : imp() ? cm / 2.54 : cm);
function fmtSnow(cm, unit = true) {
  if (cm == null || Number.isNaN(cm)) return '—';
  const v = snowVal(cm);
  const s = v < 0.05 ? '0' : v < 10 ? v.toFixed(1).replace(/\.0$/, '') : Math.round(v).toString();
  return unit ? `${s}${imp() ? '"' : ' cm'}` : s;
}
const snowUnit = () => (imp() ? 'in' : 'cm');
const tempVal = c => (c == null ? null : imp() ? c * 9 / 5 + 32 : c);
const fmtTemp = c => (c == null ? '—' : `${Math.round(tempVal(c))}°`);
const windVal = k => (k == null ? null : imp() ? k * 0.621371 : k);
const fmtWind = k => (k == null ? '—' : `${Math.round(windVal(k))} ${imp() ? 'mph' : 'km/h'}`);
const elevVal = m => (m == null ? null : imp() ? m * 3.28084 : m);
const fmtElev = m => (m == null ? '—' : `${Math.round(elevVal(m)).toLocaleString()} ${imp() ? 'ft' : 'm'}`);
const fmtRange = s => (s && s.n > 1 && s.max - s.min > 0.25 ? `${fmtSnow(s.min, false)}–${fmtSnow(s.max)}` : '');
const pick = s => (s ? s[S.snow] : null); // windows: { smart, raw }

// Sequential heat class for snow amounts (by cm).
function heat(cm) {
  if (cm == null) return 'na';
  const t = [0.25, 2.5, 7.5, 15, 25, 40, 60];
  let i = 0; while (i < t.length && cm >= t[i]) i++;
  return 'h' + i;
}

const WMO = {
  0: ['☀️', 'Clear'], 1: ['🌤️', 'Mostly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'],
  45: ['🌫️', 'Fog'], 48: ['🌫️', 'Freezing fog'], 51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌧️', 'Heavy drizzle'],
  56: ['🌧️', 'Freezing drizzle'], 57: ['🌧️', 'Freezing drizzle'], 61: ['🌧️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'],
  66: ['🌧️', 'Freezing rain'], 67: ['🌧️', 'Freezing rain'], 71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'], 75: ['❄️', 'Heavy snow'], 77: ['🌨️', 'Snow grains'],
  80: ['🌦️', 'Rain showers'], 81: ['🌧️', 'Rain showers'], 82: ['⛈️', 'Violent showers'], 85: ['🌨️', 'Snow showers'], 86: ['❄️', 'Heavy snow showers'],
  95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Thunderstorm + hail'], 99: ['⛈️', 'Thunderstorm + hail'],
};
const wx = (code, isDay = 1) => {
  const w = WMO[code] || ['·', 'Unknown'];
  if (!isDay && (code === 0 || code === 1)) return ['🌙', w[1]];
  return w;
};
const compass = d => (d == null ? '' : ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(d / 22.5) % 16]);

// Dates: `date` strings are resort-local YYYY-MM-DD; unix times + utc offset -> local wall clock.
const dayName = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
const shortDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const localDate = (t, off) => new Date((t + off) * 1000).toISOString().slice(0, 10);
const localHour = (t, off) => new Date((t + off) * 1000).getUTCHours();
function hourLabel(t, off) {
  const d = new Date((t + off) * 1000);
  const h = d.getUTCHours();
  return `${d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })} ${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;
}
const ago = iso => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 60 ? `${m} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

// ------------------------------------------------------------------------------------------------
// Data
// ------------------------------------------------------------------------------------------------
const memo = new Map();
async function api(path, ttl = 5 * 60e3) {
  const hit = memo.get(path);
  if (hit && Date.now() - hit.t < ttl) return hit.p;
  const p = fetch(path).then(async r => {
    const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
    if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
    return j;
  });
  memo.set(path, { t: Date.now(), p });
  p.catch(() => memo.delete(path));
  return p;
}
let RESORTS = null;
async function resorts() {
  if (!RESORTS) RESORTS = (await api('/api/resorts', 864e5)).resorts;
  return RESORTS;
}

// ------------------------------------------------------------------------------------------------
// Charts
// ------------------------------------------------------------------------------------------------
let charts = [];
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function destroyCharts() { charts.forEach(c => c.destroy()); charts = []; }
function baseOptions({ yTitle, stacked = false, beginAtZero = true } = {}) {
  const muted = css('--text-muted'), grid = css('--grid');
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: css('--surface-1'), titleColor: css('--text-primary'), bodyColor: css('--text-secondary'),
        borderColor: css('--border'), borderWidth: 1, padding: 10, boxPadding: 4, usePointStyle: true,
      },
    },
    scales: {
      x: { stacked, grid: { display: false }, border: { color: css('--axis') }, ticks: { color: muted, maxRotation: 0, autoSkip: false, font: { size: 11 } } },
      y: { stacked, beginAtZero, grid: { color: grid }, border: { display: false }, ticks: { color: muted, font: { size: 11 } },
        title: yTitle ? { display: true, text: yTitle, color: muted, font: { size: 11 } } : undefined },
    },
  };
}
function addChart(canvas, config) {
  if (!window.Chart || !canvas) return null;
  const c = new Chart(canvas, config);
  charts.push(c);
  return c;
}
// Show a tick only at local midnight (or every 6h on short ranges).
const tickEvery = (times, off, everyH) => (val, i) => {
  const t = times[i];
  if (t == null) return '';
  const h = localHour(t, off);
  if (everyH < 24 ? h % everyH === 0 : h === 0) {
    if (h === 0) return dayName(localDate(t, off));
    return `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;
  }
  return '';
};
// Simple plugin to draw dashed reference lines with labels (no annotation plugin needed).
const refLines = {
  id: 'refLines',
  afterDatasetsDraw(chart, _, opts) {
    const lines = opts.lines || [];
    const { ctx, chartArea: a, scales: { y } } = chart;
    lines.forEach(l => {
      const py = y.getPixelForValue(l.y);
      if (py < a.top || py > a.bottom) return;
      ctx.save();
      ctx.strokeStyle = l.color; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a.left, py); ctx.lineTo(a.right, py); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = css('--text-secondary'); ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'right'; ctx.fillText(l.label, a.right - 4, py - 4);
      ctx.restore();
    });
  },
};
if (window.Chart) Chart.register(refLines);

// ------------------------------------------------------------------------------------------------
// Router
// ------------------------------------------------------------------------------------------------
const app = document.getElementById('app');
let mapInstance = null;
async function route() {
  destroyCharts();
  if (mapInstance) { mapInstance.remove(); mapInstance = null; }
  const h = location.hash.replace(/^#\/?/, '');
  const [page, ...rest] = h.split('/');
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active',
    (a.dataset.nav === 'dash' && !page) || a.dataset.nav === page));
  window.scrollTo(0, 0);
  try {
    if (!page) await renderDashboard();
    else if (page === 'map') await renderMap();
    else if (page === 'models') await renderModels();
    else if (page === 'resort') await renderResort(decodeURIComponent(rest.join('/')));
    else app.innerHTML = '<p class="loading">Page not found. <a href="#/">Back to dashboard</a></p>';
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="card"><p class="err">Couldn't load: ${esc(e.message)}</p><p><a href="javascript:location.reload()">Retry</a></p></div>`;
  }
}
window.addEventListener('hashchange', route);
const rerender = () => route();

// ------------------------------------------------------------------------------------------------
// Header controls
// ------------------------------------------------------------------------------------------------
function syncToggles() {
  document.querySelectorAll('[data-units]').forEach(b => b.classList.toggle('on', b.dataset.units === S.units));
  document.querySelectorAll('[data-snow]').forEach(b => b.classList.toggle('on', b.dataset.snow === S.snow));
}
document.querySelectorAll('[data-units]').forEach(b => b.addEventListener('click', () => { S.units = b.dataset.units; store.set('units', S.units); syncToggles(); rerender(); }));
document.querySelectorAll('[data-snow]').forEach(b => b.addEventListener('click', () => { S.snow = b.dataset.snow; store.set('snowMode', S.snow); syncToggles(); rerender(); }));
document.getElementById('theme').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const t = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('theme', t); } catch {}
  rerender();
});
syncToggles();

function toggleFav(id) {
  S.favs.has(id) ? S.favs.delete(id) : S.favs.add(id);
  store.set('favs', [...S.favs]);
}

// Search: resorts (instant) + places (geocoder) -> custom spots.
const searchEl = document.getElementById('search');
const resultsEl = document.getElementById('search-results');
let geoTimer = null, searchItems = [], searchFocus = -1;
const spotId = (name, lat, lon, elev) => `custom~${(+lat).toFixed(4)}~${(+lon).toFixed(4)}~${Math.round(elev || 0)}~${encodeURIComponent(name).slice(0, 70)}`;
function drawSearch(local, places, loading) {
  searchItems = [];
  let html = '';
  if (local.length) {
    html += '<div class="sr-head">Ikon destinations & saved spots</div>';
    local.forEach(r => { searchItems.push({ href: `#/resort/${encodeURIComponent(r.id)}` }); html += `<button class="sr" data-i="${searchItems.length - 1}">${esc(r.name)} <span class="muted small">· ${esc(r.region)}</span></button>`; });
  }
  if (places.length) {
    html += '<div class="sr-head">Places (forecast any spot)</div>';
    places.forEach(p => {
      searchItems.push({ place: p });
      html += `<button class="sr" data-i="${searchItems.length - 1}">${esc(p.name)} <span class="muted small">· ${esc(p.admin)} · ${fmtElev(p.elevation)}</span></button>`;
    });
  }
  if (loading) html += '<div class="sr-head">Searching places…</div>';
  if (!html) html = '<div class="sr-head">No matches</div>';
  resultsEl.innerHTML = html;
  resultsEl.hidden = false;
  searchFocus = -1;
}
function chooseSearch(i) {
  const it = searchItems[i];
  if (!it) return;
  if (it.href) location.hash = it.href;
  else {
    const p = it.place;
    const id = spotId(p.name, p.lat, p.lon, p.elevation);
    if (!S.spots.some(s => s.id === id)) { S.spots.push({ id, name: p.name, admin: p.admin, lat: p.lat, lon: p.lon, elev: p.elevation }); store.set('spots', S.spots); }
    location.hash = `#/resort/${encodeURIComponent(id)}`;
  }
  searchEl.value = ''; resultsEl.hidden = true; searchEl.blur();
}
searchEl.addEventListener('input', async () => {
  const q = searchEl.value.trim().toLowerCase();
  clearTimeout(geoTimer);
  if (!q) { resultsEl.hidden = true; return; }
  const list = await resorts();
  const local = [...list, ...S.spots.map(s => ({ ...s, region: 'Saved spot' }))]
    .filter(r => `${r.name} ${r.region} ${r.state || ''} ${r.group || ''}`.toLowerCase().includes(q)).slice(0, 8);
  drawSearch(local, [], q.length >= 3);
  if (q.length >= 3) geoTimer = setTimeout(async () => {
    try { const g = await api(`/api/geocode?q=${encodeURIComponent(q)}`, 864e5); if (searchEl.value.trim().toLowerCase() === q) drawSearch(local, g.results, false); }
    catch { drawSearch(local, [], false); }
  }, 350);
});
searchEl.addEventListener('keydown', e => {
  const btns = resultsEl.querySelectorAll('.sr');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    searchFocus = Math.max(0, Math.min(btns.length - 1, searchFocus + (e.key === 'ArrowDown' ? 1 : -1)));
    btns.forEach((b, i) => b.classList.toggle('focus', i === searchFocus));
  } else if (e.key === 'Enter') chooseSearch(searchFocus >= 0 ? searchFocus : 0);
  else if (e.key === 'Escape') { resultsEl.hidden = true; searchEl.blur(); }
});
resultsEl.addEventListener('mousedown', e => { const b = e.target.closest('.sr'); if (b) { e.preventDefault(); chooseSearch(+b.dataset.i); } });
searchEl.addEventListener('blur', () => setTimeout(() => { resultsEl.hidden = true; }, 150));

// ================================================================================================
// DASHBOARD
// ================================================================================================
async function renderDashboard() {
  app.innerHTML = `<div class="page-title"><div><h1>Ikon Snow Forecast</h1><p>Loading multi-model forecasts for every Ikon destination…</p></div></div>
    <div class="powder">${'<div class="skeleton"></div>'.repeat(6)}</div>`;
  const [list, ov] = await Promise.all([resorts(), api('/api/overview')]);
  const byId = new Map(ov.resorts.map(o => [o.id, o]));
  const rows = list.map(r => ({ r, o: byId.get(r.id) })).filter(x => x.o);
  const w = (x, k) => pick(x.o.windows[k])?.mean ?? null;

  const regions = ['All', '★ Favorites', ...new Set(list.map(r => r.region))];
  const top = [...rows].sort((a, b) => (w(b, 'next72') ?? -1) - (w(a, 'next72') ?? -1)).slice(0, 6);
  const quiet = top.every(x => (w(x, 'next72') || 0) < 2.5);
  const top7 = quiet ? [...rows].sort((a, b) => (w(b, 'next7d') ?? -1) - (w(a, 'next7d') ?? -1)).slice(0, 6) : top;
  const heroKey = quiet ? 'next7d' : 'next72';

  app.innerHTML = `
    <div class="page-title">
      <div><h1>${quiet ? 'Quiet next 72 h — biggest 7-day totals' : 'Powder Watch — next 72 hours'}</h1>
      <p>${rows.length} Ikon destinations · mid-mountain · blend of ${esc(ov.models.join(', '))} · ${S.snow === 'smart' ? 'smart snow ratio' : 'raw model snowfall'} · updated ${ago(ov.generatedAt)}</p></div>
    </div>
    <div class="powder">${top7.map((x, i) => {
      const s = pick(x.o.windows[heroKey]);
      return `<a class="pcard" href="#/resort/${x.r.id}">
        <span class="rank">#${i + 1}</span>
        <div class="nm">${esc(x.r.name)}</div><div class="rg">${esc(x.r.region)}${x.r.state ? ' · ' + esc(x.r.state) : ''}</div>
        <div class="big num">${fmtSnow(s?.mean)} <small>${quiet ? '7 days' : '72 h'}</small></div>
        <div class="sub">${s && s.n > 1 ? `models ${fmtSnow(s.min, false)}–${fmtSnow(s.max)}` : ''} · 7d ${fmtSnow(w(x, 'next7d'))}</div>
        ${sparkbars(x.o.daily)}
      </a>`;
    }).join('')}</div>
    ${S.spots.length ? `<div class="controls"><div class="chips"><span class="muted small" style="align-self:center">Saved spots:</span>${S.spots.map(s => `<a class="chip" href="#/resort/${encodeURIComponent(s.id)}">${esc(s.name)}</a>`).join('')}</div></div>` : ''}
    <div class="controls">
      <div class="chips" id="regions">${regions.map(g => `<button class="chip ${S.dash.region === g ? 'on' : ''}" data-region="${esc(g)}">${esc(g)}</button>`).join('')}</div>
      <input id="filter" type="search" placeholder="Filter…" style="padding:6px 10px;border-radius:9px;border:1px solid var(--border);background:var(--surface-1);color:var(--text-primary);font:inherit;max-width:180px">
    </div>
    <div class="card" style="padding:0"><div class="table-wrap"><table id="dash-table"></table></div></div>
    <p class="note">Snow totals are the mean of ECMWF IFS, GFS and ICON at mid-mountain elevation; small text shows the model range. "Past 48 h" is modelled, not observed — open a resort for SNOTEL observations, 9–15 models and ensembles.</p>`;

  const cols = [
    { k: 'name', t: 'Resort' }, { k: 'temp', t: 'Now' },
    { k: 'past48', t: 'Past 48 h', r: 1 }, { k: 'next24', t: 'Next 24 h', r: 1 }, { k: 'next72', t: 'Next 72 h', r: 1 },
    { k: 'next7d', t: 'Next 7 d', r: 1 }, { k: 'spark', t: '10-day', ns: 1 }, { k: 'next10d', t: '10 d total', r: 1 },
  ];
  const table = app.querySelector('#dash-table');
  const filterEl = app.querySelector('#filter');
  function draw() {
    const q = filterEl.value.trim().toLowerCase();
    let data = rows.filter(x => S.dash.region === 'All' || (S.dash.region === '★ Favorites' ? S.favs.has(x.r.id) : x.r.region === S.dash.region))
      .filter(x => !q || `${x.r.name} ${x.r.region} ${x.r.state || ''}`.toLowerCase().includes(q));
    const k = S.dash.sort, dir = S.dash.dir;
    const val = x => (k === 'name' ? x.r.name : k === 'temp' ? x.o.current.temp : w(x, k));
    data.sort((a, b) => {
      const fa = S.favs.has(a.r.id), fb = S.favs.has(b.r.id);
      if (fa !== fb) return fa ? -1 : 1;
      const va = val(a), vb = val(b);
      if (k === 'name') return dir * String(va).localeCompare(vb);
      return dir * ((va ?? -999) - (vb ?? -999));
    });
    table.innerHTML = `<thead><tr><th></th>${cols.map(c => `<th class="${c.r ? 'r' : ''} ${c.ns ? '' : 'sortable'} ${S.dash.sort === c.k ? 'sorted' : ''}" data-k="${c.k}">${c.t}${S.dash.sort === c.k ? (S.dash.dir < 0 ? ' ↓' : ' ↑') : ''}</th>`).join('')}</tr></thead>
      <tbody>${data.map(x => {
        const c = x.o.current; const [ic, lbl] = wx(c.code, c.isDay);
        const cell = key => { const s = pick(x.o.windows[key]); return `<td class="r"><span class="snowv">${fmtSnow(s?.mean)}</span><span class="range">${fmtRange(s)}</span></td>`; };
        return `<tr>
          <td><button class="star ${S.favs.has(x.r.id) ? 'on' : ''}" data-fav="${x.r.id}" aria-label="Favorite ${esc(x.r.name)}">★</button></td>
          <td class="rname"><a href="#/resort/${x.r.id}">${esc(x.r.name)}</a><span class="rg">${esc(x.r.region)}${x.r.state ? ' · ' + esc(x.r.state) : ''} · ${fmtElev(x.o.elev)}</span></td>
          <td><span class="now-cell"><span class="wx" title="${esc(lbl)}">${ic}</span><span class="num">${fmtTemp(c.temp)}</span><span class="muted small">${fmtWind(c.wind)}</span></span></td>
          ${cell('past48')}${cell('next24')}${cell('next72')}${cell('next7d')}
          <td>${sparkbars(x.o.daily)}</td>
          ${cell('next10d')}
        </tr>`;
      }).join('') || `<tr><td colspan="9" class="loading">${S.dash.region === '★ Favorites' ? 'No favorites yet — tap ★ on any resort.' : 'No matches.'}</td></tr>`}</tbody>`;
  }
  draw();
  table.addEventListener('click', e => {
    const th = e.target.closest('th.sortable');
    if (th) { const k = th.dataset.k; S.dash.dir = S.dash.sort === k ? -S.dash.dir : (k === 'name' ? 1 : -1); S.dash.sort = k; store.set('dash', S.dash); draw(); }
    const fav = e.target.closest('[data-fav]');
    if (fav) { toggleFav(fav.dataset.fav); draw(); }
  });
  app.querySelector('#regions').addEventListener('click', e => {
    const b = e.target.closest('[data-region]'); if (!b) return;
    S.dash.region = b.dataset.region; store.set('dash', S.dash);
    app.querySelectorAll('#regions .chip').forEach(c => c.classList.toggle('on', c === b));
    draw();
  });
  filterEl.addEventListener('input', draw);
}

function sparkbars(daily) {
  const vals = (daily || []).map(d => d[S.snow]);
  const max = Math.max(2.5, ...vals.map(v => v || 0));
  return `<div class="sparkbars" title="Daily snowfall, next 10 days">${vals.map((v, i) =>
    `<span class="${!v || v < 0.25 ? 'zero' : ''}" style="height:${Math.max(2, ((v || 0) / max) * 30)}px" title="${dayName(daily[i].date)}: ${fmtSnow(v)}"></span>`).join('')}</div>`;
}

// ================================================================================================
// MAP
// ================================================================================================
async function renderMap() {
  app.innerHTML = `<div class="page-title"><div><h1>Snow Map</h1><p>Ikon destinations shaded by forecast snowfall (mid-mountain, 3-model mean).</p></div>
    <div class="seg" id="mapwin">${[['next24', '24 h'], ['next72', '72 h'], ['next7d', '7 days'], ['next10d', '10 days']].map(([k, t]) => `<button data-w="${k}" class="${S.mapWin === k ? 'on' : ''}">${t}</button>`).join('')}</div></div>
    <div id="map"></div>
    <div class="map-legend" style="margin-top:10px" id="map-legend"></div>`;
  const [list, ov] = await Promise.all([resorts(), api('/api/overview')]);
  const byId = new Map(ov.resorts.map(o => [o.id, o]));
  const dark = css('--page').toLowerCase() === '#0d0d0d';
  const map = L.map('map', { worldCopyJump: true, zoomControl: true });
  map.fitBounds(list.filter(r => r.country === 'US' && r.state !== 'AK').map(r => [r.lat, r.lon]), { padding: [30, 30] });
  mapInstance = map;
  const esri = p => `https://server.arcgisonline.com/ArcGIS/rest/services/${p}/MapServer/tile/{z}/{y}/{x}`;
  const attribution = 'Tiles &copy; Esri — Esri, HERE, Garmin, USGS, NGA, EPA, USDA, NPS, OpenStreetMap contributors';
  if (dark) {
    L.tileLayer(esri('Canvas/World_Dark_Gray_Base'), { attribution, maxZoom: 16 }).addTo(map);
    L.tileLayer(esri('Canvas/World_Dark_Gray_Reference'), { maxZoom: 16 }).addTo(map);
  } else L.tileLayer(esri('World_Topo_Map'), { attribution, maxZoom: 18 }).addTo(map);
  const colorFor = cm => { const h = heat(cm); return h === 'h0' || h === 'na' ? css('--model-muted') : css(`--seq-${{ h1: 100, h2: 200, h3: 300, h4: 400, h5: 500, h6: 600, h7: 700 }[h]}`); };
  const layer = L.layerGroup().addTo(map);
  function draw() {
    layer.clearLayers();
    list.forEach(r => {
      const o = byId.get(r.id); if (!o) return;
      const v = pick(o.windows[S.mapWin])?.mean;
      L.circleMarker([r.lat, r.lon], {
        radius: 6 + Math.sqrt(Math.max(0, v || 0)) * 1.6, color: css('--surface-1'), weight: 2, fillColor: colorFor(v), fillOpacity: 0.95,
      }).bindPopup(`<b>${esc(r.name)}</b><br><span style="color:#888">${esc(r.region)}</span><br>
        Next 24 h: <b>${fmtSnow(pick(o.windows.next24)?.mean)}</b><br>Next 72 h: <b>${fmtSnow(pick(o.windows.next72)?.mean)}</b><br>
        Next 7 d: <b>${fmtSnow(pick(o.windows.next7d)?.mean)}</b><br>Now: ${fmtTemp(o.current.temp)} ${wx(o.current.code, o.current.isDay)[0]}<br>
        <a href="#/resort/${r.id}">Full forecast →</a>`).bindTooltip(`${esc(r.name)}: ${fmtSnow(v)}`).addTo(layer);
    });
  }
  draw();
  const steps = [[0.25, 2.5, 100], [2.5, 7.5, 200], [7.5, 15, 300], [15, 25, 400], [25, 40, 500], [40, 60, 600], [60, null, 700]];
  app.querySelector('#map-legend').innerHTML = `<span><i style="background:var(--model-muted)"></i>none</span>` + steps.map(([a, b, s]) =>
    `<span><i style="background:var(--seq-${s})"></i>${fmtSnow(a, false)}${b ? '–' + fmtSnow(b) : '+' + (imp() ? '"' : ' cm')}</span>`).join('');
  app.querySelector('#mapwin').addEventListener('click', e => {
    const b = e.target.closest('[data-w]'); if (!b) return;
    S.mapWin = b.dataset.w; store.set('mapWin', S.mapWin);
    app.querySelectorAll('#mapwin button').forEach(x => x.classList.toggle('on', x === b));
    draw();
  });
}

// ================================================================================================
// MODELS / ABOUT
// ================================================================================================
async function renderModels() {
  const m = await api('/api/models', 864e5);
  app.innerHTML = `<div class="prose stack">
    <div class="page-title"><div><h1>Models & Method</h1><p>What feeds each forecast, and how snow totals are computed.</p></div></div>
    <div class="card"><div class="card-head"><h2>Deterministic models</h2><span class="pill">${Object.keys(m.deterministic).length} models</span></div>
      <div class="table-wrap"><table><thead><tr><th>Model</th><th>Agency</th><th>Resolution</th><th>Notes</th></tr></thead><tbody>
      ${Object.values(m.deterministic).map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.org)}</td><td>${esc(x.res)}</td><td class="muted">${esc(x.note)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="note">Regional high-resolution models (HRRR, NAM, NBM for the US; ICON-CH1/CH2 and ICON-2I for the Alps; AROME, HRDPS, MSM and ICON-D2 inside the "seamless" blends) are used automatically where they have coverage. Each resort page lists exactly which models returned data.</p></div>
    <div class="card"><div class="card-head"><h2>Ensembles</h2><span class="pill">${Object.values(m.ensembles).reduce((a, x) => a + x.members, 0)} members</span></div>
      <div class="table-wrap"><table><thead><tr><th>System</th><th>Agency</th><th class="r">Members</th></tr></thead><tbody>
      ${Object.values(m.ensembles).map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.org)}</td><td class="r">${x.members}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="note">Ensembles run a model many times with slightly perturbed starting conditions. The spread (10th–90th percentile) shows how confident the forecast is. The "grand ensemble" weights each system equally so ECMWF's 51 members don't drown out the others.</p></div>
    <div class="card"><h2>Smart snow vs. raw snow</h2>
      <p>Raw model snowfall assumes a fixed ~7:1 snow-to-liquid ratio, computed at the model grid cell's elevation — often far below a ski area's summit. That systematically under-forecasts mountain snow.</p>
      <p><b>Smart</b> mode (default) fixes both problems using the temperature downscaled to the elevation you pick (base, mid, or summit):</p>
      <ol><li><b>Rain/snow split at your elevation:</b> precipitation is snow below −0.5 °C, rain above +2.5 °C, and mixed in between — so a storm that rains in the valley-floor grid cell is counted as snow up top.</li>
      <li><b>Temperature-based snow ratio:</b> ~8:1 near freezing (dense, wet), ~12:1 at −4 °C, up to ~17:1 in cold storms (light, dry powder), following published snow-to-liquid ratio climatology.</li></ol>
      <p>Switch to <b>Raw</b> in the header to see unadjusted model output. Real-world snow ratios also depend on temperatures aloft, wind and riming, so treat any single number with healthy skepticism — that's why the model range and ensembles are shown.</p></div>
    <div class="card"><h2>Other sources (US resorts)</h2><ul>
      <li><b>NWS</b> — the official human-edited forecast, gridded snowfall and snow level, active watches/warnings, and the Area Forecast Discussion where forecasters explain their reasoning.</li>
      <li><b>SNOTEL</b> — USDA automated stations measuring real snow depth, snow-water equivalent and temperature near the resort.</li>
      <li><b>avalanche.org</b> — current danger rating from the local avalanche center.</li></ul></div>
  </div>`;
}

// ================================================================================================
// RESORT DETAIL
// ================================================================================================
async function renderResort(id) {
  const list = await resorts();
  let r = list.find(x => x.id === id);
  if (!r && id.startsWith('custom~')) {
    const [, lat, lon, elev, name] = id.split('~');
    const saved = S.spots.find(s => s.id === id);
    r = { id, custom: true, name: decodeURIComponent(name), region: saved?.admin || 'Custom spot', lat: +lat, lon: +lon, base: +elev, summit: +elev };
  }
  if (!r) { app.innerHTML = '<p class="loading">Unknown resort. <a href="#/">Back</a></p>'; return; }
  const elevChoice = r.custom ? 'summit' : S.elev;
  const elevM = elevChoice === 'base' ? r.base : elevChoice === 'summit' ? r.summit : Math.round((r.base + r.summit) / 2);
  const q = `?elev=${elevChoice}`;
  const eid = encodeURIComponent(id);
  const isSpot = r.custom;
  const saved = isSpot ? S.spots.some(s => s.id === id) : S.favs.has(id);

  app.innerHTML = `
    <div class="r-head">
      <div>
        <h1>${esc(r.name)} <button class="star ${saved ? 'on' : ''}" id="fav" aria-label="Save" title="${isSpot ? 'Save spot' : 'Favorite'}">★</button></h1>
        <div class="meta">${isSpot ? '' : '<span class="badge">IKON</span> '}${esc(r.region)}${r.state ? ', ' + esc(r.state) : ''}${r.group ? ' · ' + esc(r.group) : ''}
          · ${isSpot ? fmtElev(r.base) : `${fmtElev(r.base)} – ${fmtElev(r.summit)} (${fmtElev(r.summit - r.base).replace(/ (ft|m)$/, '')} vert)`}
          ${r.url ? ` · <a href="${esc(r.url)}" target="_blank" rel="noopener">Resort site ↗</a>` : ''}
          · <a href="https://www.google.com/maps/@${r.lat},${r.lon},13z" target="_blank" rel="noopener">Map ↗</a></div>
      </div>
      ${isSpot ? '' : `<div class="elev-pick"><span class="muted small">Forecast elevation</span><div class="seg" id="elev">
        ${[['base', 'Base', r.base], ['mid', 'Mid', Math.round((r.base + r.summit) / 2)], ['summit', 'Summit', r.summit]].map(([k, t, m]) =>
          `<button data-e="${k}" class="${elevChoice === k ? 'on' : ''}">${t} <span class="muted small">${fmtElev(m)}</span></button>`).join('')}</div></div>`}
    </div>
    <div id="r-alerts"></div>
    <section class="tiles" id="r-now"><div class="skeleton" style="grid-column:1/-1"></div></section>
    <section class="card section" id="r-days"><div class="skeleton"></div></section>
    <section class="card section" id="r-models"><div class="skeleton"></div></section>
    <div class="grid grid-2 section">
      <section class="card" id="r-cum"><div class="skeleton"></div></section>
      <section class="card" id="r-ens"><div class="skeleton"></div></section>
    </div>
    <section class="card section" id="r-hourly"><div class="skeleton"></div></section>
    <section class="card section" id="r-nws" hidden></section>
    <div class="grid grid-2 section">
      <section class="card" id="r-obs"><div class="skeleton"></div></section>
      <section class="card" id="r-avy"><div class="skeleton"></div></section>
    </div>
    <section class="card section" id="r-history"><div class="skeleton"></div></section>`;

  app.querySelector('#fav').addEventListener('click', e => {
    if (isSpot) {
      const i = S.spots.findIndex(s => s.id === id);
      if (i >= 0) S.spots.splice(i, 1); else S.spots.push({ id, name: r.name, admin: r.region, lat: r.lat, lon: r.lon, elev: r.base });
      store.set('spots', S.spots);
      e.currentTarget.classList.toggle('on', i < 0);
    } else { toggleFav(id); e.currentTarget.classList.toggle('on', S.favs.has(id)); }
  });
  app.querySelector('#elev')?.addEventListener('click', e => {
    const b = e.target.closest('[data-e]'); if (!b) return;
    S.elev = b.dataset.e; store.set('elev', S.elev); route();
  });

  const fail = (sel, e) => { const el = app.querySelector(sel); if (el) el.innerHTML = `<p class="err">${esc(e.message)}</p>`; };
  const fc = api(`/api/resort/${eid}/forecast${q}`);
  const cur = api(`/api/resort/${eid}/current${q}`);
  Promise.all([fc, cur.catch(() => null)]).then(([f, c]) => {
    renderNow(r, f, c);
    renderDays(f);
    renderModelTable(f);
    renderCumulative(f);
    renderHourly(r, f, elevM);
    if (c) renderHistory(c); else app.querySelector('#r-history').hidden = true;
  }).catch(e => { ['#r-now', '#r-days', '#r-models', '#r-cum', '#r-hourly'].forEach(s => fail(s, e)); });
  api(`/api/resort/${eid}/ensemble${q}&mode=${S.snow}`).then(renderEnsemble).catch(e => fail('#r-ens', e));
  api(`/api/resort/${eid}/nws`).then(n => renderNws(n)).catch(e => { const el = app.querySelector('#r-nws'); el.hidden = false; el.innerHTML = `<h2>National Weather Service</h2><p class="err">${esc(e.message)}</p>`; });
  api(`/api/resort/${eid}/snotel`, 30 * 60e3).then(s => renderSnotel(r, s)).catch(e => fail('#r-obs', e));
  api(`/api/resort/${eid}/avalanche`, 15 * 60e3).then(a => renderAvy(r, a)).catch(e => fail('#r-avy', e));
}

// --- Now + headline totals ----------------------------------------------------------------------
function renderNow(r, f, c) {
  const W = f.consensus.windows;
  const tile = (lbl, s, det = '') => `<div class="tile"><div class="lbl">${lbl}</div><div class="val num">${fmtSnow(s?.median)}</div>
    <div class="det">${s && s.n > 1 ? `range ${fmtSnow(s.min, false)}–${fmtSnow(s.max)} · ${s.n} models` : s ? `${s.n} model` : 'beyond model range'}${det}</div></div>`;
  let hero = '';
  if (c) {
    const x = c.current; const [ic, lbl] = wx(x.weather_code, x.is_day);
    const past7 = c.history.slice(-7).reduce((a, d) => a + (d.snow || 0), 0);
    hero = `<div class="tile hero"><div class="wxbig" aria-hidden="true">${ic}</div><div>
      <div class="lbl">Now at ${fmtElev(f.point.elev)} · ${esc(lbl)}</div>
      <div class="val num">${fmtTemp(x.temperature_2m)} <small>feels ${fmtTemp(x.apparent_temperature)}</small></div>
      <div class="det">Wind ${compass(x.wind_direction_10m)} ${fmtWind(x.wind_speed_10m)}, gusts ${fmtWind(x.wind_gusts_10m)} · RH ${x.relative_humidity_2m}%</div>
      <div class="det">Freezing level ${fmtElev(x.freezing_level_height)} · Cloud ${x.cloud_cover}%${x.visibility != null ? ` · Vis ${imp() ? (x.visibility / 1609).toFixed(1) + ' mi' : (x.visibility / 1000).toFixed(1) + ' km'}` : ''}</div>
      <div class="det muted">Past 7 days (modelled): ${fmtSnow(past7)} · Sunrise ${c.sunrise?.slice(11) || '—'} · Sunset ${c.sunset?.slice(11) || '—'}</div>
    </div></div>`;
  }
  app.querySelector('#r-now').innerHTML = hero +
    tile('Next 24 h', pick(W.next24)) + tile('Next 72 h', pick(W.next72)) + tile('Next 7 days', pick(W.next7d)) + tile('Next 16 days', pick(W.next16d));
}

// --- 16-day strip ---------------------------------------------------------------------------------
function renderDays(f) {
  const today = localDate(f.time[Math.max(0, f.nowIndex)], f.utcOffset);
  const days = f.consensus.daily.filter(d => d.date >= today && pick(d));
  const max = Math.max(5, ...days.map(d => pick(d)?.median || 0));
  app.querySelector('#r-days').innerHTML = `
    <div class="card-head"><div><h2>Daily outlook</h2><p class="muted small">Consensus (median) of ${f.models.length} models at ${fmtElev(f.point.elev)} · range shows lowest–highest model</p></div>
      <span class="pill">${esc(f.timezone)}</span></div>
    <div class="days">${days.map(d => {
      const s = pick(d);
      return `<div class="day ${d.date === today ? 'today' : ''}" title="${s.n} models">
        <div class="dn">${d.date === today ? 'Today' : dayName(d.date)}</div><div class="dd">${shortDate(d.date)}</div>
        <div class="bar"><span class="${s.median < 0.25 ? 'zero' : ''}" style="height:${Math.max(2, (s.median / max) * 54)}px"></span></div>
        <div class="sn num">${fmtSnow(s.median)}</div>
        <div class="rng num">${s.n > 1 && s.max >= 0.25 ? `${fmtSnow(s.min, false)}–${fmtSnow(s.max, false)}` : '&nbsp;'}</div>
        <div class="t num">${fmtTemp(d.tmax)} / ${fmtTemp(d.tmin)}</div>
        <div class="rng" title="Freezing level">❄ ${d.fz != null ? fmtElev(d.fz) : '—'}</div>
        <div class="rng" title="Max gust">💨 ${fmtWind(d.gust)}</div>
      </div>`;
    }).join('')}</div>`;
}

// --- Model comparison table -------------------------------------------------------------------------
let selModel = null;
function renderModelTable(f) {
  const today = localDate(f.time[Math.max(0, f.nowIndex)], f.utcOffset);
  const dates = f.consensus.daily.map(d => d.date).filter(d => d >= today).slice(0, 16);
  const cell = v => `<td class="heat ${heat(v)}">${v == null ? '·' : fmtSnow(v, false)}</td>`;
  const tot = s => `<td class="r"><b>${fmtSnow(s)}</b></td>`;
  const rowsHtml = f.models.map(m => {
    const by = new Map(m.daily.map(d => [d.date, d[S.snow]]));
    return `<tr data-m="${m.id}" class="${selModel === m.id ? 'sel' : ''}">
      <td><div class="mname">${esc(m.name)}<small>${esc(m.org)} · ${esc(m.res)} · ${m.horizonHours} h</small></div></td>
      ${tot(m.windows.next72[S.snow])}${tot(m.windows.next7d[S.snow])}
      ${dates.map(d => cell(by.get(d))).join('')}</tr>`;
  }).join('');
  const cons = new Map(f.consensus.daily.map(d => [d.date, pick(d)?.median]));
  app.querySelector('#r-models').innerHTML = `
    <div class="card-head"><div><h2>Model-by-model snowfall (${snowUnit()})</h2>
      <p class="muted small">Click a model to highlight it in the charts. "·" = beyond that model's range.${f.unavailable.length ? ` Unavailable here: ${f.unavailable.map(u => esc(u.id)).join(', ')}.` : ''}</p></div></div>
    <div class="table-wrap"><table class="mtable"><thead><tr><th>Model</th><th class="r">72 h</th><th class="r">7 d</th>${dates.map(d => `<th class="heat">${d === today ? 'Today' : dayName(d)}<br><span style="font-weight:400">${shortDate(d).replace(/^\w+ /, '')}</span></th>`).join('')}</tr></thead>
    <tbody><tr class="cons" data-m=""><td><div class="mname">Consensus<small>median of all models</small></div></td>
      ${tot(pick(f.consensus.windows.next72)?.median)}${tot(pick(f.consensus.windows.next7d)?.median)}
      ${dates.map(d => cell(cons.get(d))).join('')}</tr>${rowsHtml}</tbody></table></div>`;
  app.querySelector('#r-models tbody').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-m]'); if (!tr) return;
    selModel = tr.dataset.m && selModel !== tr.dataset.m ? tr.dataset.m : null;
    app.querySelectorAll('#r-models tr[data-m]').forEach(x => x.classList.toggle('sel', !!selModel && x.dataset.m === selModel));
    renderCumulative(f);
  });
}

// --- Cumulative snowfall by model -------------------------------------------------------------------
let cumChart = null;
function renderCumulative(f) {
  const start = Math.max(0, f.nowIndex);
  const times = f.time.slice(start);
  const cum = arr => { let a = 0, alive = true; return arr.slice(start).map(v => { if (!alive || v == null) { alive = false; return null; } a += v; return +snowVal(a).toFixed(2); }); };
  const series = f.models.map(m => ({ m, data: cum(m.hourly[S.snow]) }));
  // Consensus accumulation: each step adds the change in the median measured over the SAME set of
  // models at both ends, so short-range models (HRRR, NAM…) dropping out never makes the line jump or dip.
  const med = v => { v = v.slice().sort((x, y) => x - y); const k = Math.floor(v.length / 2); return v.length % 2 ? v[k] : (v[k - 1] + v[k]) / 2; };
  const consensus = [];
  for (let i = 0; i < times.length; i++) {
    const alive = series.filter(s => s.data[i] != null);
    if (!alive.length) { consensus.push(null); continue; }
    if (i === 0) { consensus.push(med(alive.map(s => s.data[0]))); continue; }
    const both = alive.filter(s => s.data[i - 1] != null);
    const inc = both.length ? Math.max(0, med(both.map(s => s.data[i])) - med(both.map(s => s.data[i - 1]))) : 0;
    consensus.push(+((consensus[i - 1] ?? 0) + inc).toFixed(2));
  }
  const sel = series.find(s => s.m.id === selModel);
  const el = app.querySelector('#r-cum');
  if (cumChart) { charts = charts.filter(c => c !== cumChart); cumChart.destroy(); }
  el.innerHTML = `<div class="card-head"><div><h2>Accumulated snowfall</h2><p class="muted small">Each gray line is one model; blue is the consensus${sel ? `; orange is ${esc(sel.m.name)}` : ''}.</p></div></div>
    <div class="legend"><span><i style="background:var(--series-1)"></i>Consensus</span><span><i style="background:var(--model-muted)"></i>Individual models</span>${sel ? `<span><i style="background:var(--series-2)"></i>${esc(sel.m.name)}</span>` : ''}</div>
    <div class="chart-box"><canvas></canvas></div>`;
  const o = baseOptions({ yTitle: snowUnit() });
  o.scales.x.ticks.callback = tickEvery(times, f.utcOffset, 24);
  o.plugins.tooltip.callbacks = {
    title: items => hourLabel(times[items[0].dataIndex], f.utcOffset),
    label: c => ` ${c.dataset.label}: ${c.parsed.y == null ? '—' : c.parsed.y.toFixed(1)} ${snowUnit()}`,
  };
  o.plugins.tooltip.itemSort = (a, b) => b.parsed.y - a.parsed.y;
  o.plugins.tooltip.filter = c => c.parsed.y != null;
  const datasets = series.filter(s => s !== sel).map(s => ({ label: s.m.name, data: s.data, borderColor: css('--model-muted'), borderWidth: 1.25, pointRadius: 0, tension: 0.2, order: 3 }));
  if (sel) datasets.push({ label: sel.m.name, data: sel.data, borderColor: css('--series-2'), borderWidth: 2.5, pointRadius: 0, tension: 0.2, order: 1 });
  datasets.push({ label: 'Consensus', data: consensus, borderColor: css('--series-1'), borderWidth: 3, pointRadius: 0, tension: 0.2, order: 0 });
  cumChart = addChart(el.querySelector('canvas'), { type: 'line', data: { labels: times.map((_, i) => i), datasets }, options: o });
}

// --- Ensemble plume + probabilities --------------------------------------------------------------------
function renderEnsemble(e) {
  const el = app.querySelector('#r-ens');
  const g = e.grand;
  const conv = arr => arr.map(v => (v == null ? null : +snowVal(v).toFixed(2)));
  const th = imp() ? [6, 12, 24] : [15, 30, 60];
  const thCm = th.map(t => (imp() ? t * 2.54 : t));
  const prob = (key, cm) => {
    const sys = e.systems.filter(s => s.totals[key]);
    if (!sys.length) return null;
    return sys.reduce((a, s) => a + s.totals[key].filter(v => v >= cm).length / s.totals[key].length, 0) / sys.length;
  };
  const pct = p => (p == null ? '—' : `${Math.round(p * 100)}%`);
  const q = (arr, p) => (arr && arr.length ? arr[Math.min(arr.length - 1, Math.floor(p * (arr.length - 1) + 0.5))] : null);
  el.innerHTML = `<div class="card-head"><div><h2>Ensemble outlook</h2><p class="muted small">${e.systems.reduce((a, s) => a + s.members, 0)} members from ${e.systems.map(s => esc(s.name)).join(', ')}</p></div></div>
    <div class="legend"><span><i class="box" style="background:var(--band-2)"></i>10th–90th percentile</span><span><i style="background:var(--series-1)"></i>Median</span></div>
    <div class="chart-box"><canvas></canvas></div>
    <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Chance of at least…</th>${th.map(t => `<th class="r">${t}${imp() ? '"' : ' cm'}</th>`).join('')}</tr></thead><tbody>
      ${[['next72', '72 hours'], ['next7d', '7 days'], ['next15d', '15 days']].map(([k, t]) => `<tr><td>${t}</td>${thCm.map(c => `<td class="r num">${pct(prob(k, c))}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>
    <details style="margin-top:10px"><summary>Per-system 7-day totals</summary>
      <div class="table-wrap"><table><thead><tr><th>System</th><th class="r">Members</th><th class="r">Low (p10)</th><th class="r">Median</th><th class="r">High (p90)</th></tr></thead><tbody>
      ${e.systems.map(s => { const t = s.totals.next7d; return `<tr><td>${esc(s.name)} <span class="muted small">${esc(s.org)}</span></td><td class="r">${s.members}</td>${t ? [0.1, 0.5, 0.9].map(p => `<td class="r num">${fmtSnow(q(t, p))}</td>`).join('') : `<td colspan="3" class="r muted">${Math.round(s.horizonHours / 24)}-day range only</td>`}</tr>`; }).join('')}
      </tbody></table></div></details>
    <p class="note">Each member's snowfall uses the ${S.snow === 'smart' ? 'smart elevation-adjusted' : 'raw model'} method. Probabilities weight each system equally.</p>`;
  const times = e.time;
  const o = baseOptions({ yTitle: snowUnit() });
  o.scales.x.ticks.callback = tickEvery(times, e.utcOffset, 24);
  o.plugins.tooltip.callbacks = {
    title: items => hourLabel(times[items[0].dataIndex], e.utcOffset),
    label: c => ` ${c.dataset.label}: ${c.parsed.y == null ? '—' : c.parsed.y.toFixed(1)} ${snowUnit()}`,
  };
  addChart(el.querySelector('canvas'), {
    type: 'line',
    data: {
      labels: times.map((_, i) => i),
      datasets: [
        { label: '90th pct', data: conv(g.p90), borderColor: 'transparent', backgroundColor: css('--band-2'), pointRadius: 0, fill: '+1', tension: 0.2 },
        { label: '10th pct', data: conv(g.p10), borderColor: 'transparent', pointRadius: 0, fill: false, tension: 0.2 },
        { label: 'Median', data: conv(g.p50), borderColor: css('--series-1'), borderWidth: 2.5, pointRadius: 0, tension: 0.2 },
      ],
    },
    options: o,
  });
}

// --- Hourly detail -----------------------------------------------------------------------------------
function renderHourly(r, f, elevM) {
  const el = app.querySelector('#r-hourly');
  const start = Math.max(0, f.nowIndex);
  const hours = Math.min(S.hourlyRange, f.time.length - start);
  const sl = a => a.slice(start, start + hours);
  const times = sl(f.time);
  const C = f.consensus.hourly;
  const tMin = times.map((_, i) => { const v = f.models.map(m => m.hourly.temp[start + i]).filter(x => x != null); return v.length ? tempVal(Math.min(...v)) : null; });
  const tMax = times.map((_, i) => { const v = f.models.map(m => m.hourly.temp[start + i]).filter(x => x != null); return v.length ? tempVal(Math.max(...v)) : null; });
  el.innerHTML = `<div class="card-head"><div><h2>Hour by hour</h2><p class="muted small">Consensus of all models at ${fmtElev(f.point.elev)}</p></div>
    <div class="seg" id="hr">${[[48, '48 h'], [72, '72 h'], [168, '7 d'], [384, '16 d']].map(([h, t]) => `<button data-h="${h}" class="${S.hourlyRange === h ? 'on' : ''}">${t}</button>`).join('')}</div></div>
    <h3 class="small muted">Snowfall per hour (${snowUnit()})</h3><div class="chart-box xs"><canvas id="h-snow"></canvas></div>
    <h3 class="small muted" style="margin-top:12px">Temperature (°${imp() ? 'F' : 'C'}) — line: consensus, band: model range</h3><div class="chart-box sm"><canvas id="h-temp"></canvas></div>
    <h3 class="small muted" style="margin-top:12px">Freezing level (${imp() ? 'ft' : 'm'}) vs. the mountain</h3><div class="chart-box sm"><canvas id="h-fz"></canvas></div>
    <h3 class="small muted" style="margin-top:12px">Wind (${imp() ? 'mph' : 'km/h'})</h3>
    <div class="legend"><span><i style="background:var(--series-1)"></i>Sustained</span><span><i style="background:var(--series-2)"></i>Gusts</span></div>
    <div class="chart-box sm"><canvas id="h-wind"></canvas></div>`;
  el.querySelector('#hr').addEventListener('click', e => {
    const b = e.target.closest('[data-h]'); if (!b) return;
    S.hourlyRange = +b.dataset.h; store.set('hourlyRange', S.hourlyRange);
    charts.filter(c => el.contains(c.canvas)).forEach(c => c.destroy());
    charts = charts.filter(c => !el.contains(c.canvas));
    renderHourly(r, f, elevM);
  });
  const every = hours <= 48 ? 6 : hours <= 72 ? 12 : 24;
  const opts = (yTitle, extra = {}) => {
    const o = baseOptions({ yTitle, ...extra });
    o.scales.x.ticks.callback = tickEvery(times, f.utcOffset, every);
    o.plugins.tooltip.callbacks = { title: items => hourLabel(times[items[0].dataIndex], f.utcOffset) };
    return o;
  };
  const labels = times.map((_, i) => i);
  // Snow
  const so = opts(null);
  so.plugins.tooltip.callbacks.label = c => ` Snow: ${fmtSnow(sl(C[S.snow])[c.dataIndex])}`;
  addChart(el.querySelector('#h-snow'), { type: 'bar', data: { labels, datasets: [{ data: sl(C[S.snow]).map(v => (v == null ? null : snowVal(v))), backgroundColor: css('--series-1'), borderRadius: 2, barPercentage: 1, categoryPercentage: 0.9 }] }, options: so });
  // Temperature
  const to = opts(null, { beginAtZero: false });
  to.plugins.refLines = { lines: [{ y: imp() ? 32 : 0, color: css('--series-1'), label: 'Freezing' }] };
  to.plugins.tooltip.filter = c => c.datasetIndex === 2;
  to.plugins.tooltip.callbacks.label = c => ` Temp: ${Math.round(c.parsed.y)}° (models ${Math.round(tMin[c.dataIndex])}–${Math.round(tMax[c.dataIndex])}°)`;
  addChart(el.querySelector('#h-temp'), { type: 'line', data: { labels, datasets: [
    { data: tMax, borderColor: 'transparent', backgroundColor: css('--band'), pointRadius: 0, fill: '+1' },
    { data: tMin, borderColor: 'transparent', pointRadius: 0, fill: false },
    { data: sl(C.temp).map(tempVal), borderColor: css('--text-primary'), borderWidth: 2, pointRadius: 0, tension: 0.25 },
  ] }, options: to });
  // Freezing level
  const fo = opts(null, { beginAtZero: false });
  const fzData = sl(C.fz).map(elevVal);
  const fzVals = fzData.filter(v => v != null);
  if (!r.custom) fo.plugins.refLines = { lines: [{ y: elevVal(r.summit), color: css('--series-3'), label: 'Summit' }, { y: elevVal(r.base), color: css('--series-4'), label: 'Base' }] };
  else fo.plugins.refLines = { lines: [{ y: elevVal(elevM), color: css('--series-3'), label: 'Spot' }] };
  const lo = Math.min(...fzVals, elevVal(r.base)), hi = Math.max(...fzVals, elevVal(r.summit));
  fo.scales.y.suggestedMin = Math.max(0, lo - (hi - lo) * 0.1); fo.scales.y.suggestedMax = hi + (hi - lo) * 0.1;
  fo.plugins.tooltip.callbacks.label = c => ` Freezing level: ${Math.round(c.parsed.y).toLocaleString()} ${imp() ? 'ft' : 'm'}`;
  addChart(el.querySelector('#h-fz'), { type: 'line', data: { labels, datasets: [{ data: fzData, borderColor: css('--text-primary'), borderWidth: 2, pointRadius: 0, tension: 0.25, spanGaps: true }] }, options: fo });
  if (!fzVals.length) el.querySelector('#h-fz').parentElement.innerHTML = '<p class="muted small">No freezing-level data from these models.</p>';
  // Wind
  const wo = opts(null);
  wo.plugins.tooltip.callbacks.label = c => ` ${c.datasetIndex ? 'Gusts' : 'Wind'}: ${Math.round(c.parsed.y)} ${imp() ? 'mph' : 'km/h'}`;
  addChart(el.querySelector('#h-wind'), { type: 'line', data: { labels, datasets: [
    { data: sl(C.wind).map(windVal), borderColor: css('--series-1'), borderWidth: 2, pointRadius: 0, tension: 0.25 },
    { data: sl(C.gust).map(windVal), borderColor: css('--series-2'), borderWidth: 2, pointRadius: 0, tension: 0.25 },
  ] }, options: wo });
}

// --- NWS ---------------------------------------------------------------------------------------------
function renderNws(n) {
  const el = app.querySelector('#r-nws');
  if (!n.available) return;
  el.hidden = false;
  const alerts = n.alerts || [];
  if (alerts.length) {
    app.querySelector('#r-alerts').innerHTML = alerts.map(a => `<div class="alert ${/Advisory|Statement|Outlook/i.test(a.event) ? 'minor' : ''}">
      <b>${esc(a.event)}</b> <span class="muted small">${a.ends ? 'until ' + new Date(a.ends).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : ''}</span>
      <div class="small">${esc(a.headline || '')}</div>
      <details><summary class="small">Details</summary><p class="small" style="white-space:pre-wrap">${esc(a.description)}${a.instruction ? '\n\n' + esc(a.instruction) : ''}</p></details></div>`).join('');
  }
  const snowDays = n.snowDaily || [];
  const levels = new Map((n.snowLevel || []).map(s => [s.date, s]));
  el.innerHTML = `<div class="card-head"><div><h2>National Weather Service — ${esc(n.office)}</h2>
      <p class="muted small">Official forecast${n.forecastUpdated ? ' · updated ' + ago(n.forecastUpdated) : ''}${n.gridElevation != null ? ` · NWS grid elevation ${fmtElev(n.gridElevation)}` : ''}</p></div>
      <a href="${esc(n.officeUrl)}" target="_blank" rel="noopener" class="small">weather.gov/${esc(n.office.toLowerCase())} ↗</a></div>
    ${snowDays.length ? `<div class="table-wrap"><table><thead><tr><th>NWS gridded</th>${snowDays.map(d => `<th class="heat">${dayName(d.date)}<br><span style="font-weight:400">${shortDate(d.date).replace(/^\w+ /, '')}</span></th>`).join('')}</tr></thead><tbody>
      <tr><td>Snowfall</td>${snowDays.map(d => `<td class="heat ${heat(d.cm)}">${fmtSnow(d.cm, false)}</td>`).join('')}</tr>
      <tr><td>Snow level</td>${snowDays.map(d => { const l = levels.get(d.date); return `<td class="heat small">${l ? (Math.round(elevVal(l.min) / 100) / 10).toFixed(1) + 'k' : '—'}</td>`; }).join('')}</tr>
    </tbody></table></div><p class="note">Snow level in thousands of ${imp() ? 'feet' : 'meters'} (lowest of the day). NWS snowfall is for the NWS grid cell, which may differ from your selected elevation.</p>` : ''}
    ${n.periods ? `<div class="periods" style="margin-top:12px">${n.periods.slice(0, 8).map(p => `<div class="period">
      <b>${esc(p.name)}</b><span class="pt num">${imp() || p.unit !== 'F' ? `${p.temperature}°${p.unit}` : `${Math.round((p.temperature - 32) * 5 / 9)}°C`}</span>
      ${p.pop != null ? `<span class="pill">${p.pop}% precip</span>` : ''}<span class="muted small"> ${esc(p.wind)}</span>
      <div class="small" style="margin-top:4px">${esc(p.detailed)}</div></div>`).join('')}</div>` : `<p class="err">${esc(n.forecastError || '')}</p>`}
    ${n.afd ? `<details style="margin-top:12px"><summary>Area Forecast Discussion — forecaster reasoning (issued ${ago(n.afd.issued)})</summary><div class="afd">${esc(n.afd.text)}</div></details>` : ''}`;
}

// --- SNOTEL / observations -----------------------------------------------------------------------------
function renderSnotel(r, s) {
  const el = app.querySelector('#r-obs');
  if (!s.available || !s.stations.length) {
    el.innerHTML = `<h2>Snow observations</h2><p class="muted">${s.available ? 'No SNOTEL station within 45 km.' : 'SNOTEL is a US network.'}
      ${obsLink(r)}</p>`;
    return;
  }
  const ch = v => (v == null ? '—' : `${v > 0 ? '+' : ''}${fmtSnow(v)}`);
  el.innerHTML = `<div class="card-head"><div><h2>SNOTEL observations</h2><p class="muted small">Measured snow depth & water content at nearby USDA stations</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Station</th><th class="r">Depth</th><th class="r">SWE</th><th class="r">24 h</th><th class="r">72 h</th><th class="r">Temp</th></tr></thead><tbody>
    ${s.stations.map(x => `<tr><td><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a><span class="range">${fmtElev(x.elevM)} · ${imp() ? (x.km * 0.621).toFixed(1) + ' mi' : x.km + ' km'} away · ${x.latest ? shortDate(x.latest.date) : ''}</span></td>
      <td class="r num"><b>${fmtSnow(x.latest?.depthCm)}</b></td><td class="r num">${fmtSnow(x.latest?.sweCm)}</td>
      <td class="r num">${ch(x.change24)}</td><td class="r num">${ch(x.change72)}</td><td class="r num">${fmtTemp(x.latest?.tobsC)}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="legend" style="margin-top:12px">${s.stations.map((x, i) => `<span><i style="background:var(--series-${i + 1})"></i>${esc(x.name)}</span>`).join('')}</div>
    <div class="chart-box sm"><canvas></canvas></div>
    <p class="note">Snow depth change is a lower bound on new snow (settling offsets it). Depth sensors can read a few inches in summer from vegetation.</p>`;
  const dates = [...new Set(s.stations.flatMap(x => x.series.map(v => v.date)))].sort();
  const o = baseOptions({ yTitle: `depth (${snowUnit()})` });
  o.scales.x.ticks.callback = (v, i) => (i % 3 === 0 ? shortDate(dates[i]) : '');
  o.plugins.tooltip.callbacks = { title: items => shortDate(dates[items[0].dataIndex]), label: c => ` ${c.dataset.label}: ${fmtSnow(c.raw == null ? null : imp() ? c.raw * 2.54 : c.raw)}` };
  addChart(el.querySelector('canvas'), { type: 'line', data: { labels: dates, datasets: s.stations.map((x, i) => {
    const m = new Map(x.series.map(v => [v.date, v.depthCm]));
    return { label: x.name, data: dates.map(d => (m.get(d) == null ? null : snowVal(m.get(d)))), borderColor: css(`--series-${i + 1}`), borderWidth: 2, pointRadius: 0, spanGaps: true, tension: 0.2 };
  }) }, options: o });
}
function obsLink(r) {
  const links = { CA: ['https://www.avalanche.ca/', 'Avalanche Canada'], CH: ['https://www.slf.ch/', 'SLF'], FR: ['https://meteofrance.com/meteo-montagne', 'Météo-France Montagne'],
    IT: ['https://www.aineva.it/', 'AINEVA'], AT: ['https://lawinen.report/', 'Avalanche.report'], NZ: ['https://www.avalanche.net.nz/', 'NZ Avalanche Advisory'],
    JP: ['https://nisekoavalanche.com/', 'Niseko Avalanche Info'] };
  const l = links[r.country];
  return l ? `<br>Local snowpack & avalanche info: <a href="${l[0]}" target="_blank" rel="noopener">${l[1]} ↗</a>` : '';
}

// --- Avalanche ------------------------------------------------------------------------------------------
function renderAvy(r, a) {
  const el = app.querySelector('#r-avy');
  const scale = ['#888888', '#50b848', '#fff200', '#f7941e', '#ed1c24', '#231f20'];
  if (!a.available || !a.forecast) {
    el.innerHTML = `<h2>Avalanche danger</h2><p class="muted">${a.available ? 'No US avalanche center zone covers this location.' : 'avalanche.org covers US centers only.'}${obsLink(r)}</p>
      <p class="note">Inbounds terrain at open resorts is mitigated by ski patrol. Danger ratings apply to the backcountry.</p>`;
    return;
  }
  const f = a.forecast;
  const lvl = f.level >= 1 && f.level <= 5 ? f.level : 0;
  el.innerHTML = `<div class="card-head"><div><h2>Avalanche danger</h2><p class="muted small">${esc(f.center)} · ${esc(f.zone)}${f.nearby ? ' (nearest zone)' : ''}</p></div></div>
    <div class="danger"><div class="lvl" style="background:${scale[lvl]}" aria-hidden="true">${lvl || '–'}</div>
      <div><b style="font-size:1.2rem">${esc(f.label)}</b>${f.offSeason ? ' <span class="pill">off-season</span>' : ''}
      <div class="small muted">${esc(f.travelAdvice || '')}</div>
      <div class="small" style="margin-top:6px"><a href="${esc(f.link)}" target="_blank" rel="noopener">Full forecast ↗</a></div></div></div>
    <p class="note">North American danger scale: 1 Low · 2 Moderate · 3 Considerable · 4 High · 5 Extreme. Ratings apply to backcountry terrain, not patrolled in-bounds runs.</p>`;
}

// --- Recent history -------------------------------------------------------------------------------------
function renderHistory(c) {
  const el = app.querySelector('#r-history');
  const h = c.history;
  const total = h.reduce((a, d) => a + (d.snow || 0), 0);
  el.innerHTML = `<div class="card-head"><div><h2>Past 14 days (modelled)</h2><p class="muted small">Best-match model analysis — ${fmtSnow(total)} total. Compare with SNOTEL for measured values.</p></div></div>
    <div class="chart-box xs"><canvas></canvas></div>`;
  const o = baseOptions();
  o.scales.x.ticks.callback = (v, i) => (i % 2 === 0 ? shortDate(h[i].date) : '');
  o.plugins.tooltip.callbacks = { title: items => `${dayName(h[items[0].dataIndex].date)} ${shortDate(h[items[0].dataIndex].date)}`,
    label: c2 => ` Snow: ${fmtSnow(h[c2.dataIndex].snow)} · ${fmtTemp(h[c2.dataIndex].tmax)}/${fmtTemp(h[c2.dataIndex].tmin)}` };
  addChart(el.querySelector('canvas'), { type: 'bar', data: { labels: h.map(d => d.date), datasets: [{ data: h.map(d => snowVal(d.snow || 0)), backgroundColor: css('--series-1'), borderRadius: 4, maxBarThickness: 28 }] }, options: o });
}

route();
})();
