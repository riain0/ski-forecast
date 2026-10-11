// Avalanche danger from avalanche.org (US avalanche centers), matched to the resort by forecast-zone polygon.
const { cached, fetchJSON } = require('./http');
const { haversineKm } = require('./snotel');

async function mapLayer() {
  return cached('avy:map', 30 * 60e3, () => fetchJSON('https://api.avalanche.org/v2/public/products/map-layer', { timeout: 30000 }));
}

function inRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polygons(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return [geom.coordinates];
  if (geom.type === 'MultiPolygon') return geom.coordinates;
  return [];
}

function contains(geom, pt) {
  return polygons(geom).some(poly => inRing(pt, poly[0]) && !poly.slice(1).some(h => inRing(pt, h)));
}

function minDistanceKm(geom, r) {
  let best = Infinity;
  for (const poly of polygons(geom)) for (const [lon, lat] of poly[0]) best = Math.min(best, haversineKm(r, { lat, lon }));
  return best;
}

const LEVELS = ['No rating', 'Low', 'Moderate', 'Considerable', 'High', 'Extreme'];

async function getAvalanche(r) {
  const fc = await mapLayer();
  const pt = [r.lon, r.lat];
  let feature = fc.features.find(f => contains(f.geometry, pt));
  let nearby = false;
  if (!feature) {
    let best = null, bestKm = 40;
    for (const f of fc.features) {
      const km = minDistanceKm(f.geometry, r);
      if (km < bestKm) { best = f; bestKm = km; }
    }
    feature = best; nearby = !!best;
  }
  if (!feature) return null;
  const p = feature.properties;
  const lvl = p.danger_level;
  return {
    zone: p.name, center: p.center, centerId: p.center_id, link: p.link || p.center_link, centerLink: p.center_link,
    level: lvl, label: lvl >= 1 && lvl <= 5 ? LEVELS[lvl] : 'No rating', color: p.color,
    travelAdvice: p.travel_advice, offSeason: !!p.off_season, start: p.start_date, end: p.end_date, nearby,
  };
}

module.exports = { getAvalanche };
