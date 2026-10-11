import { use } from 'react';
import { localDate } from '#shared/time';
import type { ForecastPoint } from '#shared/types';
import { loadForecast } from '../../api/data';
import { formatters, monthDay, snowStep, weekday } from '../../lib/format';
import { usePrefs } from '../../lib/prefs';

export function Outlook({ point }: { point: ForecastPoint }) {
  const prefs = usePrefs();
  const f = formatters(prefs.units);
  const { data } = use(loadForecast(point));
  const today = localDate(data.time[data.nowIndex] ?? data.time[0] ?? 0, data.utcOffset);
  const days = data.consensus.daily.filter(d => d.date >= today && d.snow[prefs.snowMode]);
  const max = Math.max(5, ...days.map(d => d.snow[prefs.snowMode]?.median ?? 0));

  return (
    <ol className="outlook">
      <li className="outlook__legend" aria-hidden="true">
        <span />
        <span />
        <span />
        <span className="eyebrow">{f.snowUnit}</span>
        <span className="eyebrow">range</span>
        <span className="eyebrow">hi/lo</span>
        <span className="eyebrow">frz {f.heightUnit}</span>
        <span className="eyebrow">gust</span>
      </li>
      {days.map(d => {
        const s = d.snow[prefs.snowMode]!;
        const fzBelow = d.freezingLevel != null && d.freezingLevel < point.elevation;
        return (
          <li key={d.date} className={d.date === today ? 'is-today' : undefined}>
            <span className="outlook__day">{d.date === today ? 'Today' : weekday(d.date)}</span>
            <span className="outlook__date mono">{monthDay(d.date)}</span>
            <span className="outlook__bar" aria-hidden="true">
              <span
                className={`fill fill--${Math.max(0, snowStep(s.median))}`}
                style={{ height: `${Math.max(3, (s.median / max) * 100)}%` }}
              />
            </span>
            <span className="outlook__snow mono">{f.snowNumber(s.median)}</span>
            <span className="outlook__range mono">
              {s.n > 1 && s.max >= 0.5 ? f.snowRange(s.min, s.max) : ' '}
            </span>
            <span className="outlook__temp mono">
              {f.temp(d.tmax)}
              <span className="dim">/{f.temp(d.tmin)}</span>
            </span>
            <span className={`outlook__fz mono ${fzBelow ? '' : 'is-warm'}`} title="Freezing level">
              {d.freezingLevel != null ? `${(f.heightValue(d.freezingLevel) / 1000).toFixed(1)}k` : '–'}
            </span>
            <span className="outlook__gust mono dim" title={`Max gust (${f.windUnit})`}>
              {f.wind(d.gust)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
