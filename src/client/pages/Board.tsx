import { use, useDeferredValue, useMemo, useState } from 'react';
import { DESTINATIONS, PASS_SEASON, REGIONS, elevationFor } from '#shared/destinations';
import type { Destination, OverviewEntry, OverviewWindow, SnowMode } from '#shared/types';
import { loadOverview } from '../api/data';
import { StarIcon, WeatherIcon } from '../components/Icons';
import { GRADES, TrailMark, gradeFor } from '../components/TrailGrade';
import { Boundary, ViaNote } from '../components/ui';
import { formatters, relativeTime, snowStep, weekday, type Formatters } from '../lib/format';
import { setPrefs, toggleStar, usePrefs, type BoardSort } from '../lib/prefs';
import { Link, hrefFor } from '../lib/router';
import { describeWeather } from '../lib/weather';

interface Row {
  d: Destination;
  o: OverviewEntry;
}

const meanOf = (o: OverviewEntry, w: OverviewWindow, mode: SnowMode) => o.windows[w][mode]?.mean ?? null;

export function BoardPage() {
  return (
    <main className="page">
      <Boundary height={480} label="Loading every mountain">
        <Board />
      </Boundary>
    </main>
  );
}

function Board() {
  const prefs = usePrefs();
  const f = formatters(prefs.units);
  const { data, via } = use(loadOverview());
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter.trim().toLowerCase());

  const rows: Row[] = useMemo(() => {
    const byId = new Map(data.entries.map(e => [e.id, e]));
    return DESTINATIONS.flatMap(d => {
      const o = byId.get(d.id);
      return o ? [{ d, o }] : [];
    });
  }, [data]);

  const leaders = (w: OverviewWindow) =>
    [...rows]
      .sort((a, b) => (meanOf(b.o, w, prefs.snowMode) ?? -1) - (meanOf(a.o, w, prefs.snowMode) ?? -1))
      .slice(0, 6);
  const withSnow = rows.filter(r => (meanOf(r.o, 'next72', prefs.snowMode) ?? 0) >= 2.5).length;

  const visible = rows
    .filter(r =>
      prefs.boardRegion === 'All'
        ? true
        : prefs.boardRegion === 'Starred'
          ? prefs.starred.includes(r.d.id)
          : r.d.region === prefs.boardRegion,
    )
    .filter(
      r =>
        !deferredFilter ||
        `${r.d.name} ${r.d.group ?? ''} ${r.d.region} ${r.d.admin ?? ''}`
          .toLowerCase()
          .includes(deferredFilter),
    )
    .sort((a, b) => {
      const sa = prefs.starred.includes(a.d.id);
      const sb = prefs.starred.includes(b.d.id);
      if (sa !== sb) return sa ? -1 : 1;
      const dir = prefs.boardSortDesc ? -1 : 1;
      if (prefs.boardSort === 'name') return dir * b.d.name.localeCompare(a.d.name);
      return (
        dir *
        ((meanOf(a.o, prefs.boardSort, prefs.snowMode) ?? -1) -
          (meanOf(b.o, prefs.boardSort, prefs.snowMode) ?? -1))
      );
    });

  const sortBy = (key: BoardSort) =>
    setPrefs(p => ({
      boardSort: key,
      boardSortDesc: p.boardSort === key ? !p.boardSortDesc : key !== 'name',
    }));

  const header = (key: BoardSort, label: string, className = 'num') => (
    <th
      className={className}
      aria-sort={prefs.boardSort === key ? (prefs.boardSortDesc ? 'descending' : 'ascending') : undefined}
    >
      <button type="button" className="th-sort" onClick={() => sortBy(key)}>
        {label}
        <span aria-hidden="true">{prefs.boardSort === key ? (prefs.boardSortDesc ? ' ↓' : ' ↑') : ''}</span>
      </button>
    </th>
  );

  return (
    <>
      <div className="dateline">
        <span className="mono">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <span>
          {rows.length} mountains · Ikon {PASS_SEASON}
        </span>
        <span>
          {data.models.join(' + ')} blend at mid-mountain · updated {relativeTime(data.generatedAt)}{' '}
          <ViaNote via={via} />
        </span>
      </div>

      <h1 className="headline">
        {withSnow > 0 ? (
          <>
            <span className="mono">{withSnow}</span> of {rows.length} mountains expect snow in the next three
            days
          </>
        ) : (
          <>A quiet three days across the pass</>
        )}
      </h1>

      <div className="leaders">
        <Leaderboard
          title="Last 48 hours"
          note="modelled"
          rows={leaders('past48')}
          window="past48"
          f={f}
          mode={prefs.snowMode}
        />
        <Leaderboard
          title="Next 72 hours"
          rows={leaders('next72')}
          window="next72"
          f={f}
          mode={prefs.snowMode}
        />
        <Leaderboard
          title="Next 7 days"
          rows={leaders('next7d')}
          window="next7d"
          f={f}
          mode={prefs.snowMode}
        />
      </div>

      <div className="board-controls">
        <nav className="tabs" aria-label="Filter by region">
          {['All', 'Starred', ...REGIONS].map(r => (
            <button
              key={r}
              type="button"
              aria-pressed={prefs.boardRegion === r}
              onClick={() => setPrefs({ boardRegion: r })}
            >
              {r}
            </button>
          ))}
        </nav>
        <input
          className="filter"
          type="search"
          placeholder="Filter list"
          aria-label="Filter mountains"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      <div className="table-scroll">
        <table className="board">
          <thead>
            <tr>
              <th className="star-col">
                <span className="visually-hidden">Starred</span>
              </th>
              {header('name', 'Mountain', '')}
              <th>Now</th>
              {header('past48', 'Past 48 h')}
              {header('next24', '24 h')}
              {header('next72', '72 h')}
              {header('next7d', '7 days')}
              <th>Next 10 days</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ d, o }) => (
              <BoardRow
                key={d.id}
                d={d}
                o={o}
                f={f}
                mode={prefs.snowMode}
                starred={prefs.starred.includes(d.id)}
              />
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="empty">
                  {prefs.boardRegion === 'Starred'
                    ? 'Star a mountain to pin it here.'
                    : 'Nothing matches that filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <GradeKey f={f} />
    </>
  );
}

function Leaderboard({
  title,
  note,
  rows,
  window,
  f,
  mode,
}: {
  title: string;
  note?: string;
  rows: Row[];
  window: OverviewWindow;
  f: Formatters;
  mode: SnowMode;
}) {
  const max = Math.max(2.5, ...rows.map(r => meanOf(r.o, window, mode) ?? 0));
  return (
    <section className="leader" aria-label={title}>
      <h2 className="leader__title">
        {title} {note && <span className="eyebrow">{note}</span>}
      </h2>
      <ol>
        {rows.map(({ d, o }) => {
          const v = meanOf(o, window, mode) ?? 0;
          return (
            <li key={d.id}>
              <Link href={hrefFor.destination(d.id)} className="leader__row">
                <span className="leader__name">{d.name}</span>
                <span className="leader__bar" aria-hidden="true">
                  <span
                    className={`fill fill--${Math.max(1, snowStep(v))}`}
                    style={{ width: `${(v / max) * 100}%` }}
                  />
                </span>
                <span className="leader__value mono">{f.snow(v)}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function BoardRow({
  d,
  o,
  f,
  mode,
  starred,
}: {
  d: Destination;
  o: OverviewEntry;
  f: Formatters;
  mode: SnowMode;
  starred: boolean;
}) {
  const weather = describeWeather(o.now.weatherCode);
  const cell = (w: OverviewWindow) => {
    const s = o.windows[w][mode];
    return (
      <td className="num">
        <span className="mono strong">{f.snowNumber(s?.mean)}</span>
        {s && s.n > 1 && s.max - s.min >= 0.5 && (
          <span className="range mono">{f.snowRange(s.min, s.max)}</span>
        )}
      </td>
    );
  };
  const grade = gradeFor(o.windows.next72[mode]?.mean);
  const dailyMax = Math.max(5, ...o.daily.map(x => x.snow[mode] ?? 0));
  return (
    <tr>
      <td className="star-col">
        <button
          type="button"
          className={`star ${starred ? 'is-on' : ''}`}
          aria-pressed={starred}
          aria-label={`Star ${d.name}`}
          onClick={() => toggleStar(d.id)}
        >
          <StarIcon filled={starred} />
        </button>
      </td>
      <th scope="row" className="mtn">
        <Link href={hrefFor.destination(d.id)}>{d.name}</Link>
        <span className="dim">
          {d.region}
          {d.admin ? ` · ${d.admin}` : ''} · {f.height(elevationFor(d, 'mid'))}
        </span>
      </th>
      <td>
        <span className="now">
          <WeatherIcon sky={weather.sky} night={!o.now.isDay} size={20} title={weather.label} />
          <span className="mono">{f.temp(o.now.temp)}</span>
          <span className="dim mono small">
            {f.wind(o.now.wind)} {f.windUnit}
          </span>
        </span>
      </td>
      {cell('past48')}
      {cell('next24')}
      {cell('next72')}
      {cell('next7d')}
      <td>
        <span
          className="spark"
          role="img"
          aria-label={`Daily snow: ${o.daily.map(x => `${weekday(x.date)} ${f.snow(x.snow[mode])}`).join(', ')}`}
        >
          {o.daily.map(x => {
            const v = x.snow[mode] ?? 0;
            return (
              <span
                key={x.date}
                className={`fill fill--${Math.max(0, snowStep(v))}`}
                style={{ height: `${Math.max(8, (v / dailyMax) * 100)}%` }}
              />
            );
          })}
        </span>
      </td>
      <td>
        <TrailMark grade={grade} />
      </td>
    </tr>
  );
}

function GradeKey({ f }: { f: Formatters }) {
  return (
    <aside className="grade-key" aria-label="Grade key">
      <span className="eyebrow">Grade · next 72 h</span>
      {GRADES.map(g => (
        <span key={g.grade}>
          <TrailMark grade={g.grade} /> {g.label} <span className="dim mono">{f.snow(g.minCm)}+</span>
        </span>
      ))}
      <span className="dim">Totals are the mean of three models; small figures show their spread.</span>
    </aside>
  );
}
