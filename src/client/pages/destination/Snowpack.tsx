import type { GeoPoint } from '#shared/types';
import { useAvalanche, useSnotel } from '../../api/data';
import { Legend, TimeChart, type Tone } from '../../components/charts/TimeChart';
import { formatters, monthDay, tick } from '../../lib/format';
import { usePrefs } from '../../lib/prefs';

const STATION_TONES: Tone[] = ['s1', 's2', 's3'];

export function Snowpack({ geo, country }: { geo: GeoPoint; country: string | undefined }) {
  const f = formatters(usePrefs().units);
  const res = useSnotel(geo, country);
  if (!res.available) return <p className="dim">{res.reason}.</p>;
  const stations = res.data;
  if (stations.length === 0) return <p className="dim">No SNOTEL station within 45 km.</p>;

  const change = (v: number | null) =>
    v == null ? '–' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${f.snowNumber(Math.abs(v))}`;
  const dates = [...new Set(stations.flatMap(s => s.series.map(r => r.date)))].sort();

  return (
    <div>
      <h3 className="chart-title">SNOTEL · measured</h3>
      <table className="snotel">
        <thead>
          <tr>
            <th>Station</th>
            <th className="num">Depth</th>
            <th className="num">SWE</th>
            <th className="num">24 h</th>
            <th className="num">72 h</th>
          </tr>
        </thead>
        <tbody>
          {stations.map(s => (
            <tr key={s.id}>
              <th scope="row">
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.name}
                </a>
                <span className="dim mono">
                  {f.height(s.elevation)} · {f.distance(s.distanceKm)} ·{' '}
                  {s.latest ? monthDay(s.latest.date) : '–'}
                </span>
              </th>
              <td className="num mono strong">{f.snowNumber(s.latest?.depth)}</td>
              <td className="num mono">{f.snowNumber(s.latest?.swe)}</td>
              <td className="num mono">{change(s.change24)}</td>
              <td className="num mono">{change(s.change72)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Legend items={stations.map((s, i) => ({ label: s.name, tone: STATION_TONES[i] ?? 'ink' }))} />
      <TimeChart
        height={150}
        ariaLabel="Measured snow depth, last 20 days"
        length={dates.length}
        layers={stations.map((s, i) => {
          const byDate = new Map(s.series.map(r => [r.date, r.depth]));
          return {
            kind: 'line' as const,
            label: s.name,
            tone: STATION_TONES[i] ?? 'ink',
            values: dates.map(d => {
              const v = byDate.get(d);
              return v == null ? null : f.snowValue(v);
            }),
          };
        })}
        format={tick}
        minSpan={f.us ? 4 : 10}
        xTick={i => (i % 4 === 0 && dates[i] ? monthDay(dates[i]) : null)}
        xTitle={i => (dates[i] ? monthDay(dates[i]) : '')}
      />
      <p className="footnote">
        Depth in {f.snowUnitLong}. Depth change is a lower bound on new snow because the pack settles; summer
        readings can show a little depth from vegetation.
      </p>
    </div>
  );
}

export function Avalanche({ geo, country }: { geo: GeoPoint; country: string | undefined }) {
  const res = useAvalanche(geo, country);
  if (!res.available) return <p className="dim">{res.reason}.</p>;
  const a = res.data;
  if (!a) return <p className="dim">No US avalanche center forecasts this area.</p>;
  return (
    <div className="avy">
      <h3 className="chart-title">Avalanche danger</h3>
      <div className="avy__rating">
        <span className={`avy__level avy__level--${a.level ?? 0}`} aria-hidden="true">
          {a.level ?? '–'}
        </span>
        <div>
          <b className="avy__label">{a.label}</b>
          {a.offSeason && <span className="eyebrow"> off-season</span>}
          <p className="dim">
            {a.center} · {a.zone}
            {a.nearestZoneOnly && ' (nearest zone)'}
          </p>
        </div>
      </div>
      {a.travelAdvice && <p className="avy__advice">{a.travelAdvice}</p>}
      <p className="footnote">
        <a href={a.link} target="_blank" rel="noopener noreferrer">
          Full forecast ↗
        </a>{' '}
        Ratings describe the backcountry, not patrolled in-bounds terrain.
      </p>
    </div>
  );
}
