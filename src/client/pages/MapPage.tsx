import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { use, useEffect, useRef } from 'react';
import { DESTINATIONS } from '#shared/destinations';
import type { OverviewWindow } from '#shared/types';
import { loadOverview } from '../api/data';
import { Boundary, Segmented } from '../components/ui';
import { formatters, snowStep } from '../lib/format';
import { setPrefs, usePrefs } from '../lib/prefs';
import { hrefFor, navigate } from '../lib/router';

const WINDOWS: { value: OverviewWindow; label: string }[] = [
  { value: 'next24', label: '24 h' },
  { value: 'next72', label: '72 h' },
  { value: 'next7d', label: '7 days' },
  { value: 'next10d', label: '10 days' },
];

const RAMP_STEPS = [0.25, 2.5, 7.5, 15, 25, 40, 60];

export function MapPage() {
  const prefs = usePrefs();
  const f = formatters(prefs.units);
  return (
    <main className="page page--map">
      <div className="map-head">
        <h1 className="headline headline--sm">Forecast snow, mid-mountain</h1>
        <Segmented
          label="Forecast window"
          value={prefs.mapWindow}
          options={WINDOWS}
          onChange={mapWindow => setPrefs({ mapWindow })}
        />
      </div>
      <Boundary height={520} label="Loading map">
        <SnowMap />
      </Boundary>
      <div className="map-key" aria-label="Legend">
        {RAMP_STEPS.map((cm, i) => (
          <span key={cm}>
            <i className={`fill fill--${i + 1}`} />
            {f.snowNumber(cm)}
            {i === RAMP_STEPS.length - 1 ? `+ ${f.snowUnit}` : ''}
          </span>
        ))}
      </div>
    </main>
  );
}

function SnowMap() {
  const prefs = usePrefs();
  const { data } = use(loadOverview());
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { worldCopyJump: true, zoomSnap: 0.5 });
    const us = DESTINATIONS.filter(d => d.country === 'US' && d.admin !== 'AK').map(
      d => [d.lat, d.lon] as [number, number],
    );
    m.fitBounds(us, { padding: [24, 24] });
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Tiles © Esri — Esri, HERE, Garmin, USGS, NGA, EPA, USDA, NPS, OpenStreetMap contributors',
        maxZoom: 18,
        className: 'map-tiles',
      },
    ).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const group = layer.current;
    if (!group) return;
    const f = formatters(prefs.units);
    const byId = new Map(data.entries.map(e => [e.id, e]));
    group.clearLayers();
    for (const d of DESTINATIONS) {
      const o = byId.get(d.id);
      if (!o) continue;
      const v = o.windows[prefs.mapWindow][prefs.snowMode]?.mean ?? null;
      const step = Math.max(0, snowStep(v));
      const icon = L.divIcon({
        className: '',
        html: `<span class="pin fill--${step}">${f.snowNumber(v)}</span>`,
        iconSize: [36, 20],
        iconAnchor: [18, 10],
      });
      L.marker([d.lat, d.lon], {
        icon,
        title: d.name,
        riseOnHover: true,
        zIndexOffset: Math.round((v ?? 0) * 10),
      })
        .bindTooltip(`${d.name} · ${f.snow(v)}`, { direction: 'top', offset: [0, -10] })
        .on('click', () => navigate(hrefFor.destination(d.id)))
        .addTo(group);
    }
  }, [data, prefs.mapWindow, prefs.snowMode, prefs.units]);

  return <div ref={el} className="snow-map" role="application" aria-label="Map of forecast snowfall" />;
}
