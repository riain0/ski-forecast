// US National Weather Service: human-edited forecast, gridded snowfall, forecaster discussion, alerts.
const { cached, fetchJSON } = require('./http');

const API = 'https://api.weather.gov';

async function point(lat, lon) {
  return cached(`nws:pt:${lat},${lon}`, 7 * 24 * 3600e3, async () => {
    const j = await fetchJSON(`${API}/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
    const p = j.properties;
    return { cwa: p.cwa, gridId: p.gridId, gridX: p.gridX, gridY: p.gridY, forecast: p.forecast, grid: p.forecastGridData, timeZone: p.timeZone, office: p.forecastOffice };
  });
}

// "2026-10-10T15:00:00+00:00/PT6H" -> { start: ms, hours }
function parseValidTime(vt) {
  const [iso, dur] = vt.split('/');
  const m = dur.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?)?/);
  const hours = (+(m[1] || 0)) * 24 + (+(m[2] || 0)) || 1;
  return { start: Date.parse(iso), hours };
}

// Spread interval totals evenly over their hours, then sum by local calendar day.
function dailyTotals(values, tz) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const days = new Map();
  for (const { validTime, value } of values || []) {
    if (value == null) continue;
    const { start, hours } = parseValidTime(validTime);
    for (let h = 0; h < hours; h++) {
      const d = fmt.format(new Date(start + h * 3600e3));
      days.set(d, (days.get(d) || 0) + value / hours);
    }
  }
  return [...days.entries()].map(([date, mm]) => ({ date, value: Math.round(mm * 10) / 10 }));
}

function dailyRange(values, tz) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const days = new Map();
  for (const { validTime, value } of values || []) {
    if (value == null) continue;
    const d = fmt.format(new Date(parseValidTime(validTime).start));
    const cur = days.get(d) || { min: Infinity, max: -Infinity };
    days.set(d, { min: Math.min(cur.min, value), max: Math.max(cur.max, value) });
  }
  return [...days.entries()].map(([date, r]) => ({ date, min: Math.round(r.min), max: Math.round(r.max) }));
}

async function getNws(r) {
  const pt = await point(r.lat, r.lon);
  const [fc, grid, afd, alerts] = await Promise.allSettled([
    cached(`nws:fc:${pt.forecast}`, 30 * 60e3, () => fetchJSON(pt.forecast)),
    cached(`nws:grid:${pt.grid}`, 30 * 60e3, () => fetchJSON(pt.grid, { timeout: 30000 })),
    getAfd(pt.cwa),
    cached(`nws:alerts:${r.lat},${r.lon}`, 10 * 60e3, () => fetchJSON(`${API}/alerts/active?point=${r.lat.toFixed(4)},${r.lon.toFixed(4)}`)),
  ]);
  const out = { office: pt.cwa, timeZone: pt.timeZone, officeUrl: `https://www.weather.gov/${pt.cwa.toLowerCase()}/` };
  if (fc.status === 'fulfilled') {
    out.periods = fc.value.properties.periods.map(p => ({
      name: p.name, start: p.startTime, isDaytime: p.isDaytime, temperature: p.temperature, unit: p.temperatureUnit,
      wind: `${p.windSpeed} ${p.windDirection}`, short: p.shortForecast, detailed: p.detailedForecast,
      pop: p.probabilityOfPrecipitation?.value ?? null, icon: p.icon,
    }));
    out.forecastUpdated = fc.value.properties.updateTime || fc.value.properties.generatedAt;
  } else out.forecastError = fc.reason.message;
  if (grid.status === 'fulfilled') {
    const g = grid.value.properties;
    out.gridElevation = g.elevation?.value;
    out.snowDaily = dailyTotals(g.snowfallAmount?.values, pt.timeZone).map(d => ({ date: d.date, cm: Math.round(d.value) / 10 }));
    out.snowLevel = dailyRange(g.snowLevel?.values, pt.timeZone);
    out.gridUpdated = g.updateTime;
  } else out.gridError = grid.reason.message;
  if (afd.status === 'fulfilled') out.afd = afd.value;
  if (alerts.status === 'fulfilled') {
    out.alerts = alerts.value.features.map(f => ({
      event: f.properties.event, headline: f.properties.headline, severity: f.properties.severity,
      description: f.properties.description, instruction: f.properties.instruction, onset: f.properties.onset, ends: f.properties.ends || f.properties.expires,
    }));
  }
  return out;
}

async function getAfd(cwa) {
  return cached(`nws:afd:${cwa}`, 60 * 60e3, async () => {
    const list = await fetchJSON(`${API}/products/types/AFD/locations/${cwa}`);
    const latest = list['@graph']?.[0];
    if (!latest) return null;
    const prod = await fetchJSON(`${API}/products/${latest.id}`);
    return { issued: prod.issuanceTime, text: prod.productText };
  });
}

module.exports = { getNws };
