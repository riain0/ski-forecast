import { use } from 'react';
import type { GeoPoint } from '#shared/types';
import { loadNws } from '../../api/data';
import { Section, SnowCell } from '../../components/ui';
import { formatters, monthDay, relativeTime, weekday } from '../../lib/format';
import { usePrefs } from '../../lib/prefs';

/** National Weather Service section; renders nothing outside NWS coverage. */
export function Nws({ geo, country }: { geo: GeoPoint; country: string | undefined }) {
  const f = formatters(usePrefs().units);
  const res = use(loadNws(geo, country));
  if (!res.available) return null;
  const n = res.data;
  const levels = new Map(n.snowLevel.map(s => [s.date, s]));
  return (
    <Section
      title="Forecasters"
      meta={
        <>
          NWS {n.office}
          {n.updatedAt && ` · issued ${relativeTime(n.updatedAt)}`} ·{' '}
          <a href={n.officeUrl} target="_blank" rel="noopener noreferrer">
            weather.gov
          </a>
        </>
      }
    >
      {n.snowDaily.length > 0 && (
        <div className="table-scroll">
          <table className="models models--compact">
            <thead>
              <tr>
                <th className="models__name">NWS grid</th>
                {n.snowDaily.map(d => (
                  <th key={d.date} className="models__day">
                    {weekday(d.date)}
                    <span className="mono dim">{monthDay(d.date).replace(/^\w+ /, '')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className="models__name">
                  Snowfall <span className="dim">{f.snowUnit}</span>
                </th>
                {n.snowDaily.map(d => (
                  <SnowCell key={d.date} cm={d.cm}>
                    {f.snowNumber(d.cm)}
                  </SnowCell>
                ))}
              </tr>
              <tr>
                <th scope="row" className="models__name">
                  Snow level <span className="dim">low, {f.heightUnit}</span>
                </th>
                {n.snowDaily.map(d => {
                  const l = levels.get(d.date);
                  return (
                    <td key={d.date} className="heat mono">
                      {l ? `${(f.heightValue(l.min) / 1000).toFixed(1)}k` : '–'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {n.gridElevation != null && (
        <p className="footnote">
          NWS figures are for its 2.5 km grid cell at {f.height(n.gridElevation)}, not the elevation selected
          above.
        </p>
      )}

      <ol className="periods">
        {n.periods.slice(0, 8).map(p => (
          <li key={p.start} className={p.isDaytime ? undefined : 'is-night'}>
            <div className="periods__head">
              <b>{p.name}</b>
              <span className="mono">
                {f.us ? `${p.temperatureF}°` : `${Math.round(((p.temperatureF - 32) * 5) / 9)}°`}
              </span>
            </div>
            <p className="periods__summary">
              {p.summary}
              {p.precipChance != null && p.precipChance > 0 && (
                <span className="mono dim"> · {p.precipChance}%</span>
              )}
            </p>
            <p className="periods__detail">{p.detail}</p>
          </li>
        ))}
      </ol>

      {n.discussion && (
        <details className="afd">
          <summary>
            Area Forecast Discussion{' '}
            <span className="dim">
              · the forecasters’ reasoning, issued {relativeTime(n.discussion.issuedAt)}
            </span>
          </summary>
          <pre>{n.discussion.text}</pre>
        </details>
      )}
    </Section>
  );
}

const LOCAL: Record<string, { href: string; label: string }[]> = {
  CA: [
    { href: 'https://avalanche.ca/', label: 'Avalanche Canada' },
    { href: 'https://weather.gc.ca/', label: 'Environment Canada' },
  ],
  CH: [
    { href: 'https://www.slf.ch/en/', label: 'SLF avalanche bulletin' },
    { href: 'https://www.meteoswiss.admin.ch/', label: 'MeteoSwiss' },
  ],
  FR: [{ href: 'https://meteofrance.com/meteo-montagne', label: 'Météo-France Montagne' }],
  IT: [{ href: 'https://www.aineva.it/', label: 'AINEVA avalanche bulletins' }],
  AT: [{ href: 'https://avalanche.report/', label: 'Avalanche.report (Tyrol)' }],
  AD: [{ href: 'https://www.meteo.ad/', label: 'Meteo Andorra' }],
  JP: [{ href: 'https://www.jma.go.jp/bosai/', label: 'Japan Meteorological Agency' }],
  NZ: [
    { href: 'https://www.avalanche.net.nz/', label: 'NZ Avalanche Advisory' },
    { href: 'https://www.metservice.com/mountain', label: 'MetService Mountain' },
  ],
  AU: [{ href: 'https://www.bom.gov.au/nsw/forecasts/snowfields.shtml', label: 'BoM snowfields' }],
  KR: [{ href: 'https://www.weather.go.kr/', label: 'Korea Meteorological Administration' }],
  CN: [{ href: 'https://www.cma.gov.cn/', label: 'China Meteorological Administration' }],
  CL: [{ href: 'https://www.meteochile.gob.cl/', label: 'Dirección Meteorológica de Chile' }],
};

export function LocalResources({ country }: { country: string | undefined }) {
  const links = (country ? LOCAL[country] : undefined) ?? [];
  return (
    <div className="local">
      <p>Observed snowpack and avalanche ratings come from national services outside the US.</p>
      {links.length > 0 && (
        <ul>
          {links.map(l => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
