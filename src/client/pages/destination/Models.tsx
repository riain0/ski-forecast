import { use, useMemo } from 'react';
import { consensusAccumulation } from '#shared/accumulate';
import { localDate, localHour } from '#shared/time';
import type { ForecastPoint, MultiModelForecast, Series, SnowMode } from '#shared/types';
import { loadForecast } from '../../api/data';
import { Legend, TimeChart, type ChartLayer } from '../../components/charts/TimeChart';
import { SnowCell, ViaNote } from '../../components/ui';
import { formatters, hourLabel, monthDay, weekday, tick } from '../../lib/format';
import { usePrefs } from '../../lib/prefs';

export function ModelTable({
  point,
  selected,
  onSelect,
}: {
  point: ForecastPoint;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const prefs = usePrefs();
  const f = formatters(prefs.units);
  const { data, via } = use(loadForecast(point));
  const mode = prefs.snowMode;
  const today = localDate(data.time[data.nowIndex] ?? 0, data.utcOffset);
  const dates = data.consensus.daily.map(d => d.date).filter(d => d >= today);
  const consensus = new Map(data.consensus.daily.map(d => [d.date, d.snow[mode]?.median ?? null]));

  return (
    <>
      <div className="table-scroll">
        <table className="models">
          <thead>
            <tr>
              <th className="models__name">Model</th>
              <th className="num">72 h</th>
              <th className="num">7 d</th>
              {dates.map(d => (
                <th key={d} className="models__day">
                  {d === today ? 'Today' : weekday(d)}
                  <span className="mono dim">{monthDay(d).replace(/^\w+ /, '')}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="models__consensus">
              <th scope="row" className="models__name">
                Consensus <span className="dim">median of {data.models.length}</span>
              </th>
              <td className="num mono">{f.snowNumber(data.consensus.windows.next72[mode]?.median)}</td>
              <td className="num mono">{f.snowNumber(data.consensus.windows.next7d[mode]?.median)}</td>
              {dates.map(d => (
                <SnowCell key={d} cm={consensus.get(d)}>
                  {f.snowNumber(consensus.get(d))}
                </SnowCell>
              ))}
            </tr>
            {data.models.map(m => {
              const byDate = new Map(m.daily.map(d => [d.date, d.snow[mode]]));
              const isSel = selected === m.id;
              return (
                <tr
                  key={m.id}
                  className={isSel ? 'is-selected' : undefined}
                  aria-selected={isSel}
                  tabIndex={0}
                  onClick={() => onSelect(isSel ? null : m.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(isSel ? null : m.id);
                    }
                  }}
                >
                  <th scope="row" className="models__name">
                    {m.name}
                    <span className="dim">
                      {m.agency} · {m.resolution} · {Math.round(m.horizonHours / 24)} d
                    </span>
                  </th>
                  <td className="num mono">{f.snowNumber(m.windows.next72[mode])}</td>
                  <td className="num mono">{f.snowNumber(m.windows.next7d[mode])}</td>
                  {dates.map(d => {
                    const v = byDate.get(d);
                    return (
                      <SnowCell key={d} cm={v}>
                        {v == null ? '·' : f.snowNumber(v)}
                      </SnowCell>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        Snowfall in {f.snowUnitLong} at {f.height(point.elevation)}, computed from each model’s precipitation
        and temperature. “·” is beyond a model’s range.
        {data.unavailable.length > 0 &&
          ` Unavailable here: ${data.unavailable.map(u => u.id).join(', ')}.`}{' '}
        <ViaNote via={via} />
      </p>
    </>
  );
}

/** Cumulative series from `start`, null after the model's last hour. */
function cumulative(values: Series, start: number, toUnit: (cm: number) => number): Series {
  let total = 0;
  let alive = true;
  return values.slice(start).map(v => {
    if (!alive || v == null) {
      alive = false;
      return null;
    }
    total += v;
    return toUnit(total);
  });
}

function accumulationLayers(
  data: MultiModelForecast,
  mode: SnowMode,
  selected: string | null,
  toUnit: (cm: number) => number,
) {
  const start = data.nowIndex;
  const runs = data.models.map(m => ({ m, values: cumulative(m.hourly.snow[mode], start, toUnit) }));
  const consensus = consensusAccumulation(runs.map(r => r.values));
  const sel = runs.find(r => r.m.id === selected);
  const layers: ChartLayer[] = [
    ...runs
      .filter(r => r !== sel)
      .map(r => ({
        kind: 'line' as const,
        label: r.m.name,
        values: r.values,
        tone: 'model' as const,
        width: 1.25,
        tooltip: false,
      })),
    ...(sel
      ? [
          {
            kind: 'line' as const,
            label: sel.m.name,
            values: sel.values,
            tone: 'signal' as const,
            width: 2.5,
          },
        ]
      : []),
    { kind: 'line', label: 'Consensus', values: consensus, tone: 'ink', width: 3 },
  ];
  return { layers, runs, sel };
}

export function Accumulation({ point, selected }: { point: ForecastPoint; selected: string | null }) {
  const prefs = usePrefs();
  const f = formatters(prefs.units);
  const { data } = use(loadForecast(point));
  const { layers, runs, sel } = useMemo(
    () => accumulationLayers(data, prefs.snowMode, selected, f.snowValue),
    [data, prefs.snowMode, selected, f.snowValue],
  );
  const times = data.time.slice(data.nowIndex);
  return (
    <>
      <Legend
        items={[
          { label: 'Consensus', tone: 'ink' },
          { label: `Each model (${runs.length})`, tone: 'model' },
          ...(sel ? [{ label: sel.m.name, tone: 'signal' as const }] : []),
        ]}
      />
      <TimeChart
        layers={layers}
        height={300}
        ariaLabel={`Accumulated snowfall by model at ${f.height(point.elevation)}`}
        format={tick}
        xTick={i => {
          const t = times[i];
          return t != null && localHour(t, data.utcOffset) === 0
            ? weekday(localDate(t, data.utcOffset))
            : null;
        }}
        xTitle={i => hourLabel(times[i] ?? 0, data.utcOffset)}
        extraRows={i => {
          const vals = runs.map(r => r.values[i]).filter((v): v is number => v != null);
          return vals.length > 1
            ? [
                {
                  label: `Model range (${vals.length})`,
                  value: `${Math.min(...vals).toFixed(1)} – ${Math.max(...vals).toFixed(1)}`,
                },
              ]
            : [];
        }}
      />
      <p className="footnote">
        Accumulated {f.snowUnitLong} from now. Click a model in the table above to trace it.
      </p>
    </>
  );
}
