import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import type { Series } from '#shared/types';

export type Tone =
  'ink' | 'model' | 'signal' | 'snow' | 'band' | 'band-strong' | 's1' | 's2' | 's3' | 'ink-3';

const TONE: Record<Tone, string> = {
  ink: 'var(--ink)',
  'ink-3': 'var(--ink-3)',
  model: 'var(--chart-model)',
  signal: 'var(--signal)',
  snow: 'var(--snow-5)',
  band: 'var(--chart-band)',
  'band-strong': 'var(--chart-band-strong)',
  s1: 'var(--series-1)',
  s2: 'var(--series-2)',
  s3: 'var(--series-3)',
};

export type ChartLayer =
  | {
      kind: 'line';
      label: string;
      values: Series;
      tone: Tone;
      width?: number;
      dashed?: boolean;
      tooltip?: boolean;
    }
  | { kind: 'band'; label: string; lower: Series; upper: Series; tone: Tone }
  | { kind: 'bars'; label: string; values: Series; tone: Tone };

export interface TimeChartProps {
  layers: ChartLayer[];
  /** Number of x positions; defaults to the longest layer. */
  length?: number;
  /** Axis label for index `i`, or null for no tick. */
  xTick: (i: number) => string | null;
  /** Tooltip heading for index `i`. */
  xTitle: (i: number) => string;
  format: (v: number) => string;
  /** Extra tooltip rows (e.g. a model range) appended after the layer rows. */
  extraRows?: (i: number) => { label: string; value: string }[];
  refLines?: { value: number; label: string; tone?: Tone }[];
  height?: number;
  zeroBased?: boolean;
  /** Minimum y-span so near-flat data doesn't look dramatic. */
  minSpan?: number;
  ariaLabel: string;
}

const PAD = { top: 12, right: 12, bottom: 24, left: 44 };

function niceStep(raw: number): number {
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}

function pathFor(values: Series, x: (i: number) => number, y: (v: number) => number): string {
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v == null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

function bandPath(lower: Series, upper: Series, x: (i: number) => number, y: (v: number) => number): string {
  const runs: number[][] = [];
  let run: number[] = [];
  upper.forEach((u, i) => {
    if (u != null && lower[i] != null) run.push(i);
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  });
  if (run.length) runs.push(run);
  return runs
    .map(r => {
      const top = r.map(i => `${x(i).toFixed(1)} ${y(upper[i]!).toFixed(1)}`);
      const bottom = [...r].reverse().map(i => `${x(i).toFixed(1)} ${y(lower[i]!).toFixed(1)}`);
      return `M${top.join('L')}L${bottom.join('L')}Z`;
    })
    .join('');
}

export function TimeChart({
  layers,
  length,
  xTick,
  xTitle,
  format,
  extraRows,
  refLines = [],
  height = 220,
  zeroBased = true,
  minSpan = 1,
  ariaLabel,
}: TimeChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(240, Math.round(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = length ?? Math.max(1, ...layers.map(l => (l.kind === 'band' ? l.upper.length : l.values.length)));
  const hasBars = layers.some(l => l.kind === 'bars');
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  const { y, ticks } = useMemo(() => {
    const values: number[] = refLines.map(r => r.value);
    for (const l of layers) {
      const sets = l.kind === 'band' ? [l.lower, l.upper] : [l.values];
      for (const s of sets) for (const v of s) if (v != null) values.push(v);
    }
    let lo = values.length ? Math.min(...values) : 0;
    let hi = values.length ? Math.max(...values) : 1;
    if (zeroBased) lo = Math.min(0, lo);
    if (hi - lo < minSpan) hi = lo + minSpan;
    const step = niceStep((hi - lo) / 4);
    const min = Math.floor(lo / step) * step;
    const max = Math.ceil(hi / step) * step;
    const t: number[] = [];
    for (let v = min; v <= max + step / 2; v += step) t.push(Number(v.toFixed(6)));
    return { y: (v: number) => PAD.top + innerH - ((v - min) / (max - min || 1)) * innerH, ticks: t };
  }, [layers, refLines, zeroBased, minSpan, innerH]);

  const slot = innerW / (hasBars ? n : Math.max(1, n - 1));
  const x = (i: number) => PAD.left + (hasBars ? (i + 0.5) * slot : i * slot);

  const indexAt = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left - PAD.left;
    const i = hasBars ? Math.floor(px / slot) : Math.round(px / slot);
    return Math.min(n - 1, Math.max(0, i));
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) =>
    setHover(indexAt(e.clientX, e.currentTarget.getBoundingClientRect()));
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setHover(h =>
        Math.min(n - 1, Math.max(0, (h ?? 0) + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 24 : 1))),
      );
    } else if (e.key === 'Escape') setHover(null);
  };

  const ticksX: { i: number; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const label = xTick(i);
    if (label) ticksX.push({ i, label });
  }

  const rows =
    hover == null
      ? []
      : [
          ...layers.flatMap(l => {
            if (l.kind === 'line' && l.tooltip === false) return [];
            if (l.kind === 'band') {
              const lo = l.lower[hover];
              const hi = l.upper[hover];
              return lo == null || hi == null
                ? []
                : [{ label: l.label, value: `${format(lo)} – ${format(hi)}`, tone: l.tone }];
            }
            const v = l.values[hover];
            return v == null ? [] : [{ label: l.label, value: format(v), tone: l.tone }];
          }),
          ...(extraRows?.(hover).map(r => ({ ...r, tone: undefined })) ?? []),
        ];
  const tipLeft = hover != null && x(hover) > width * 0.6;

  return (
    <div className="chart" ref={wrapRef}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-labelledby={titleId}
        tabIndex={0}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        <title id={titleId}>{ariaLabel}</title>
        {ticks.map(t => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className={t === 0 ? 'chart__base' : 'chart__grid'}
            />
            <text
              x={PAD.left - 8}
              y={y(t)}
              className="chart__tick"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {format(t)}
            </text>
          </g>
        ))}
        {ticksX.map(({ i, label }) => (
          <text key={i} x={x(i)} y={height - 6} className="chart__tick" textAnchor="middle">
            {label}
          </text>
        ))}
        {layers.map((l, k) => {
          if (l.kind === 'band')
            return <path key={k} d={bandPath(l.lower, l.upper, x, y)} style={{ fill: TONE[l.tone] }} />;
          if (l.kind === 'bars') {
            const w = Math.max(1, slot - (slot > 4 ? 2 : 0.5));
            return (
              <g key={k} style={{ fill: TONE[l.tone] }}>
                {l.values.map((v, i) =>
                  v == null || v <= 0 ? null : (
                    <rect
                      key={i}
                      x={x(i) - w / 2}
                      y={y(v)}
                      width={w}
                      height={Math.max(0.5, y(0) - y(v))}
                      rx={Math.min(2, w / 3)}
                    />
                  ),
                )}
              </g>
            );
          }
          return (
            <path
              key={k}
              d={pathFor(l.values, x, y)}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{
                stroke: TONE[l.tone],
                strokeWidth: l.width ?? 2,
                strokeDasharray: l.dashed ? '4 4' : undefined,
              }}
            />
          );
        })}
        {refLines.map(r => (
          <g key={r.label}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(r.value)}
              y2={y(r.value)}
              strokeDasharray="5 4"
              style={{ stroke: TONE[r.tone ?? 'ink-3'] }}
            />
            <text x={width - PAD.right - 2} y={y(r.value) - 5} textAnchor="end" className="chart__ref">
              {r.label}
            </text>
          </g>
        ))}
        {hover != null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} className="chart__cursor" />
            {layers.map((l, k) => {
              if (l.kind !== 'line' || l.tooltip === false) return null;
              const v = l.values[hover];
              return v == null ? null : (
                <circle
                  key={k}
                  cx={x(hover)}
                  cy={y(v)}
                  r={4}
                  className="chart__dot"
                  style={{ fill: TONE[l.tone] }}
                />
              );
            })}
          </g>
        )}
      </svg>
      {hover != null && rows.length > 0 && (
        <div
          className={`chart__tip ${tipLeft ? 'chart__tip--left' : ''}`}
          style={{ left: x(hover) }}
          role="status"
        >
          <div className="chart__tip-title">{xTitle(hover)}</div>
          {rows.map(r => (
            <div key={r.label} className="chart__tip-row">
              <span>
                {r.tone && <i style={{ background: TONE[r.tone] }} />}
                {r.label}
              </span>
              <b className="mono">{r.value}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Legend({
  items,
}: {
  items: { label: string; tone: Tone; shape?: 'line' | 'box' | 'dash' }[];
}) {
  return (
    <ul className="legend">
      {items.map(i => (
        <li key={i.label}>
          <i
            className={`legend__key legend__key--${i.shape ?? 'line'}`}
            style={{ background: TONE[i.tone], borderColor: TONE[i.tone] }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
