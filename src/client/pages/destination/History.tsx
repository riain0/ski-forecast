import type { ForecastPoint } from '#shared/types';
import { useCurrent } from '../../api/data';
import { TimeChart } from '../../components/charts/TimeChart';
import { formatters, monthDay, weekday, tick } from '../../lib/format';
import { usePrefs } from '../../lib/prefs';

export function History({ point }: { point: ForecastPoint }) {
  const f = formatters(usePrefs().units);
  const { data } = useCurrent(point);
  const h = data.history;
  const total = h.reduce((a, d) => a + d.snow, 0);
  return (
    <>
      <p className="history__total">
        <span className="mono">{f.snow(total)}</span> <span className="dim">in the last {h.length} days</span>
      </p>
      <TimeChart
        height={140}
        ariaLabel="Modelled daily snowfall, last 14 days"
        layers={[{ kind: 'bars', label: 'Snow', values: h.map(d => f.snowValue(d.snow)), tone: 'snow' }]}
        format={tick}
        minSpan={f.us ? 1 : 2}
        xTick={i => (i % 2 === 0 && h[i] ? monthDay(h[i].date) : null)}
        xTitle={i => (h[i] ? `${weekday(h[i].date)} ${monthDay(h[i].date)}` : '')}
        extraRows={i =>
          h[i] ? [{ label: 'High / low', value: `${f.temp(h[i].tmax)} / ${f.temp(h[i].tmin)}` }] : []
        }
      />
      <p className="footnote">
        Model analysis at a fixed 7:1 ratio, not measurements. SNOTEL above shows measured depth.
      </p>
    </>
  );
}
