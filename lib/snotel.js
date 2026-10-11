// USDA NRCS SNOTEL: real measured snow depth / SWE / temperature at nearby automated mountain stations.
const { cached, fetchJSON } = require('./http');

const AWDB = 'https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1';

function haversineKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function stations() {
  return cached('snotel:stations', 24 * 3600e3, async () => {
    const list = await fetchJSON(`${AWDB}/stations?networkCds=SNTL&activeOnly=true`, { timeout: 45000 });
    return list
      .filter(s => s.networkCode === 'SNTL')
      .map(s => ({ triplet: s.stationTriplet, name: s.name, state: s.stateCode, lat: s.latitude, lon: s.longitude, elevFt: s.elevation }));
  });
}

const inToCm = v => (v == null ? null : Math.round(v * 2.54 * 10) / 10);
const fToC = v => (v == null ? null : Math.round(((v - 32) * 5) / 9 * 10) / 10);
const isoDay = d => d.toISOString().slice(0, 10);

async function getSnotel(r, { maxKm = 45, count = 4 } = {}) {
  const all = await stations();
  const near = all
    .map(s => ({ ...s, km: haversineKm(r, s) }))
    .filter(s => s.km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
  if (!near.length) return { stations: [] };

  const end = new Date(), begin = new Date(Date.now() - 20 * 86400e3);
  const triplets = near.map(s => s.triplet).join(',');
  const data = await cached(`snotel:data:${triplets}:${isoDay(end)}`, 60 * 60e3, () =>
    fetchJSON(`${AWDB}/data?stationTriplets=${triplets}&elements=SNWD,WTEQ,TOBS,TMAX,TMIN&duration=DAILY&beginDate=${isoDay(begin)}&endDate=${isoDay(end)}`, { timeout: 30000 }));

  return {
    stations: near.map(s => {
      const d = data.find(x => x.stationTriplet === s.triplet);
      const el = code => (d?.data || []).find(e => e.stationElement.elementCode === code)?.values || [];
      const depth = el('SNWD'), swe = el('WTEQ'), tobs = el('TOBS'), tmax = el('TMAX'), tmin = el('TMIN');
      const dates = [...new Set([...depth, ...swe, ...tobs].map(v => v.date))].sort();
      const at = (arr, date) => arr.find(v => v.date === date)?.value ?? null;
      const series = dates.map(date => ({
        date,
        depthCm: inToCm(at(depth, date)), sweCm: inToCm(at(swe, date)),
        tobsC: fToC(at(tobs, date)), tmaxC: fToC(at(tmax, date)), tminC: fToC(at(tmin, date)),
      }));
      const lastWith = key => [...series].reverse().find(v => v[key] != null);
      const latest = lastWith('depthCm') || lastWith('sweCm') || series[series.length - 1] || null;
      // New snow = positive change in depth (settling makes this a lower bound).
      const change = days => {
        const withDepth = series.filter(v => v.depthCm != null);
        if (withDepth.length < days + 1) return null;
        const a = withDepth[withDepth.length - 1 - days].depthCm, b = withDepth[withDepth.length - 1].depthCm;
        return Math.round((b - a) * 10) / 10;
      };
      return {
        name: s.name, state: s.state, triplet: s.triplet, km: Math.round(s.km * 10) / 10,
        elevM: Math.round(s.elevFt * 0.3048),
        latest, change24: change(1), change72: change(3), change7d: change(7), series,
        url: `https://wcc.sc.egov.usda.gov/nwcc/site?sitenum=${s.triplet.split(':')[0]}`,
      };
    }),
  };
}

module.exports = { getSnotel, haversineKm };
