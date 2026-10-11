import { localDate, localHour } from '#shared/time';
import type { ForecastPoint, Series } from '#shared/types';
import { useForecast } from '../../api/data';
import { Legend, TimeChart } from '../../components/charts/TimeChart';
import { Segmented } from '../../components/ui';
import { formatters, hourLabel, weekday, tick } from '../../lib/format';
import { isSinglePoint, type Place } from '../../lib/place';
import { setPrefs, usePrefs } from '../../lib/prefs';

const RANGES = [
  { value: 48, label: '48 h' },
  { value: 72, label: '72 h' },
  { value: 168, label: '7 d' },
  { value: 384, label: '16 d' },
] as const;

export function Hourly({ point, place }: { point: ForecastPoint; place: Place }) {
  const prefs = usePrefs();
  const f = formatters(prefs.units);
  const { data } = useForecast(point);
  const start = data.nowIndex;
  const hours = Math.min(prefs.hourlyRange, data.time.length - start);
  const slice = (s: Series) => s.slice(start, start + hours);
  const map = (s: Series, fn: (v: number) => number) => slice(s).map(v => (v == null ? null : fn(v)));
  const times = data.time.slice(start, start + hours);
  const c = data.consensus.hourly;
  const every = hours <= 48 ? 6 : hours <= 72 ? 12 : 24;

  const common = {
    xTick: (i: number) => {
      const t = times[i];
      if (t == null) return null;
      const h = localHour(t, data.utcOffset);
      if (h % every !== 0) return null;
      return h === 0 ? weekday(localDate(t, data.utcOffset)) : `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;
    },
    xTitle: (i: number) => hourLabel(times[i] ?? 0, data.utcOffset),
    length: times.length,
  };

  const freezing = map(c.freezingLevel, f.heightValue);
  const hasFreezing = freezing.some(v => v != null);
  const mountainLines = isSinglePoint(place)
    ? [{ value: f.heightValue(point.elevation), label: 'Spot', tone: 'ink-3' as const }]
    : [
        { value: f.heightValue(place.summit), label: 'Summit', tone: 'ink-3' as const },
        { value: f.heightValue(place.base), label: 'Base', tone: 'ink-3' as const },
      ];

  return (
    <div className="hourly">
      <div className="hourly__bar">
        <span className="eyebrow">Consensus of {data.models.length} models</span>
        <Segmented
          size="sm"
          label="Time range"
          value={prefs.hourlyRange}
          options={RANGES}
          onChange={hourlyRange => setPrefs({ hourlyRange })}
        />
      </div>

      <h3 className="chart-title">Snowfall per hour · {f.snowUnit}</h3>
      <TimeChart
        {...common}
        height={130}
        ariaLabel="Hourly snowfall"
        layers={[
          { kind: 'bars', label: 'Snow', values: map(c.snow[prefs.snowMode], f.snowValue), tone: 'snow' },
        ]}
        format={tick}
        minSpan={f.us ? 0.2 : 0.5}
      />

      <h3 className="chart-title">Temperature · {f.tempUnit}</h3>
      <Legend
        items={[
          { label: 'Consensus', tone: 'ink' },
          { label: 'Model range', tone: 'band', shape: 'box' },
        ]}
      />
      <TimeChart
        {...common}
        height={170}
        zeroBased={false}
        minSpan={10}
        ariaLabel="Hourly temperature"
        refLines={[{ value: f.us ? 32 : 0, label: 'Freezing', tone: 'signal' }]}
        layers={[
          {
            kind: 'band',
            label: 'Model range',
            lower: map(c.tempMin, f.tempValue),
            upper: map(c.tempMax, f.tempValue),
            tone: 'band',
          },
          { kind: 'line', label: 'Consensus', values: map(c.temp, f.tempValue), tone: 'ink' },
        ]}
        format={v => `${Math.round(v)}°`}
      />

      {hasFreezing && (
        <>
          <h3 className="chart-title">Freezing level vs. the mountain · {f.heightUnit}</h3>
          <TimeChart
            {...common}
            height={170}
            zeroBased={false}
            minSpan={f.us ? 2000 : 600}
            ariaLabel="Freezing level compared with base and summit"
            refLines={mountainLines}
            layers={[{ kind: 'line', label: 'Freezing level', values: freezing, tone: 'ink' }]}
            format={v => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)))}
          />
        </>
      )}

      <h3 className="chart-title">Wind · {f.windUnit}</h3>
      <Legend
        items={[
          { label: 'Sustained', tone: 'ink' },
          { label: 'Gusts', tone: 'signal', shape: 'dash' },
        ]}
      />
      <TimeChart
        {...common}
        height={150}
        ariaLabel="Hourly wind and gusts"
        layers={[
          { kind: 'line', label: 'Sustained', values: map(c.wind, f.windValue), tone: 'ink' },
          { kind: 'line', label: 'Gusts', values: map(c.gust, f.windValue), tone: 'signal', dashed: true },
        ]}
        format={v => String(Math.round(v))}
      />
    </div>
  );
}
