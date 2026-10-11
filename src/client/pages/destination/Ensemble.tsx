import { quantile } from '#shared/stats';
import { localDate, localHour } from '#shared/time';
import type { EnsembleForecast, EnsembleWindow, ForecastPoint, SnowMode } from '#shared/types';
import { useEnsemble } from '../../api/data';
import { Legend, TimeChart } from '../../components/charts/TimeChart';
import { ViaNote } from '../../components/ui';
import { formatters, hourLabel, weekday, tick } from '../../lib/format';
import { usePrefs } from '../../lib/prefs';

/** Share of members at or above `cm`, averaging the systems so each counts equally. */
function chance(e: EnsembleForecast, mode: SnowMode, window: EnsembleWindow, cm: number): number | null {
  const systems = e.systems
    .map(s => s.totals[mode][window])
    .filter((t): t is number[] => !!t && t.length > 0);
  if (systems.length === 0) return null;
  return systems.reduce((sum, t) => sum + t.filter(v => v >= cm).length / t.length, 0) / systems.length;
}

const WINDOWS: { key: EnsembleWindow; label: string }[] = [
  { key: 'next72', label: '72 hours' },
  { key: 'next7d', label: '7 days' },
  { key: 'next14d', label: '14 days' },
];

export function Ensemble({ point }: { point: ForecastPoint }) {
  const prefs = usePrefs();
  const f = formatters(prefs.units);
  const { data, via } = useEnsemble(point);
  const mode = prefs.snowMode;
  const g = data.grand[mode];
  const conv = (s: (number | null)[]) => s.map(v => (v == null ? null : f.snowValue(v)));
  const thresholds = f.us ? [6, 12, 24] : [15, 30, 60];
  const toCm = (v: number) => (f.us ? v * 2.54 : v);
  const members = data.systems.reduce((a, s) => a + s.members, 0);

  return (
    <>
      <div className="split split--wide-left">
        <div>
          <Legend
            items={[
              { label: '80% of outcomes', tone: 'band-strong', shape: 'box' },
              { label: 'Median', tone: 'ink' },
            ]}
          />
          <TimeChart
            height={260}
            ariaLabel="Ensemble accumulated snowfall, 10th to 90th percentile"
            layers={[
              {
                kind: 'band',
                label: '10th–90th',
                lower: conv(g.p10),
                upper: conv(g.p90),
                tone: 'band-strong',
              },
              { kind: 'line', label: 'Median', values: conv(g.p50), tone: 'ink', width: 2.5 },
            ]}
            format={tick}
            xTick={i => {
              const t = data.time[i];
              return t != null && localHour(t, data.utcOffset) === 0
                ? weekday(localDate(t, data.utcOffset))
                : null;
            }}
            xTitle={i => hourLabel(data.time[i] ?? 0, data.utcOffset)}
          />
        </div>
        <div>
          <table className="odds">
            <caption className="eyebrow">Chance of at least…</caption>
            <thead>
              <tr>
                <th />
                {thresholds.map(t => (
                  <th key={t} className="num mono">
                    {t}
                    {f.us ? '″' : ' cm'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WINDOWS.map(w => (
                <tr key={w.key}>
                  <th scope="row">{w.label}</th>
                  {thresholds.map(t => {
                    const p = chance(data, mode, w.key, toCm(t));
                    return (
                      <td key={t} className="num">
                        <span className="odds__cell mono" style={{ ['--p' as string]: p ?? 0 }}>
                          {p == null ? '–' : `${Math.round(p * 100)}%`}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <table className="systems">
            <caption className="eyebrow">7-day spread by system</caption>
            <thead>
              <tr>
                <th>System</th>
                <th className="num">Low</th>
                <th className="num">Median</th>
                <th className="num">High</th>
              </tr>
            </thead>
            <tbody>
              {data.systems.map(s => {
                const t = s.totals[mode].next7d;
                return (
                  <tr key={s.id}>
                    <th scope="row">
                      {s.name} <span className="dim">×{s.members}</span>
                    </th>
                    {t ? (
                      [0.1, 0.5, 0.9].map(q => (
                        <td key={q} className="num mono">
                          {f.snowNumber(quantile(t, q))}
                        </td>
                      ))
                    ) : (
                      <td colSpan={3} className="num dim">
                        {Math.round(s.horizonHours / 24)}-day range
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="footnote">
        {members} members. Each centre is weighted equally, so ECMWF’s 51 members don’t outvote the rest.{' '}
        <ViaNote via={via} />
      </p>
    </>
  );
}
