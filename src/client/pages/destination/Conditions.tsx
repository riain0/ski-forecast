import { use } from 'react';
import type { ForecastPoint, ForecastWindow, GeoPoint, Stat } from '#shared/types';
import { loadCurrent, loadForecast, loadNws } from '../../api/data';
import { WeatherIcon, WindArrow } from '../../components/Icons';
import { TrailMark, gradeFor, gradeLabel } from '../../components/TrailGrade';
import { ViaNote } from '../../components/ui';
import { compass, formatters } from '../../lib/format';
import { usePrefs } from '../../lib/prefs';
import { describeWeather } from '../../lib/weather';

export function Conditions({ point }: { point: ForecastPoint }) {
  const f = formatters(usePrefs().units);
  const { data: c, via } = use(loadCurrent(point));
  const w = describeWeather(c.weatherCode);
  const fzAbove = c.freezingLevel != null ? c.freezingLevel - point.elevation : null;
  return (
    <div className="now-panel">
      <div className="now-panel__main">
        <WeatherIcon sky={w.sky} night={!c.isDay} size={56} title={w.label} />
        <div>
          <div className="now-panel__temp mono">{f.temp(c.temp)}</div>
          <div className="now-panel__sky">
            {w.label} · feels {f.temp(c.feelsLike)}
          </div>
        </div>
      </div>
      <dl className="facts">
        <div>
          <dt>Wind</dt>
          <dd className="mono">
            <WindArrow degrees={c.windDirection} /> {compass(c.windDirection)} {f.wind(c.windSpeed)}{' '}
            {f.windUnit}
            <span className="dim">{`, gusts ${f.wind(c.windGust)}`}</span>
          </dd>
        </div>
        <div>
          <dt>Freezing level</dt>
          <dd className="mono">
            {f.height(c.freezingLevel)}
            {fzAbove != null && (
              <span className="dim">
                {' '}
                ({fzAbove >= 0 ? '+' : '−'}
                {f.height(Math.abs(fzAbove))})
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Humidity · cloud</dt>
          <dd className="mono">
            {c.humidity}% · {c.cloudCover}%
          </dd>
        </div>
        <div>
          <dt>Sun</dt>
          <dd className="mono">
            {c.sunrise?.slice(11) ?? '–'} → {c.sunset?.slice(11) ?? '–'}
          </dd>
        </div>
      </dl>
      <p className="eyebrow now-panel__foot">
        Model analysis at {f.height(point.elevation)} · {c.observedAt.slice(11)} local <ViaNote via={via} />
      </p>
    </div>
  );
}

const TOTALS: { key: ForecastWindow; label: string }[] = [
  { key: 'next24', label: '24 hours' },
  { key: 'next72', label: '72 hours' },
  { key: 'next7d', label: '7 days' },
  { key: 'next10d', label: '10 days' },
];

export function Totals({ point }: { point: ForecastPoint }) {
  const prefs = usePrefs();
  const f = formatters(prefs.units);
  const { data } = use(loadForecast(point));
  const describe = (s: Stat | null) => {
    if (!s) return 'beyond model range';
    if (s.n === 1) return '1 model reaches this far';
    return `${f.snowRange(s.min, s.max)} across ${s.n} models`;
  };
  return (
    <ul className="totals">
      {TOTALS.map(t => {
        const s = data.consensus.windows[t.key][prefs.snowMode];
        const grade = gradeFor(s?.median);
        return (
          <li key={t.key}>
            <span className="eyebrow">Next {t.label}</span>
            <span className="totals__value mono">
              {f.snowNumber(s?.median)}
              <small>{f.snowUnit}</small>
            </span>
            <span className="totals__range">{describe(s)}</span>
            {t.key === 'next72' && grade !== 'none' && (
              <span className="totals__grade">
                <TrailMark grade={grade} /> {gradeLabel(grade)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Alerts({ geo, country }: { geo: GeoPoint; country: string | undefined }) {
  const res = use(loadNws(geo, country));
  if (!res.available || res.data.alerts.length === 0) return null;
  return (
    <div className="alerts" role="region" aria-label="Weather alerts">
      {res.data.alerts.map(a => (
        <details
          key={a.event + (a.ends ?? '')}
          className={`alert ${/warning/i.test(a.event) ? 'alert--warning' : ''}`}
        >
          <summary>
            <b>{a.event}</b>
            {a.ends && (
              <span className="mono dim">
                {' '}
                until{' '}
                {new Date(a.ends).toLocaleString('en-US', {
                  weekday: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            )}
            <span className="alert__headline">{a.headline}</span>
          </summary>
          <p className="prewrap">{a.description}</p>
          {a.instruction && <p className="prewrap">{a.instruction}</p>}
        </details>
      ))}
    </div>
  );
}
