import { Component, Suspense, type ReactNode } from 'react';
import { describeError, type DataPath } from '../api/data';
import { snowStep } from '../lib/format';

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  size = 'md',
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={`seg seg--${size}`} role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          className={o.value === value ? 'is-on' : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A numbered bulletin section. Numbering comes from a CSS counter, so sections that don't render
 * (e.g. NWS outside the US) never leave gaps.
 */
export function Section({
  title,
  meta,
  children,
  id,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="sec" id={id} aria-label={title}>
      <header className="sec__head">
        <h2 className="sec__title">{title}</h2>
        {meta && <div className="sec__meta">{meta}</div>}
      </header>
      <div className="sec__body">{children}</div>
    </section>
  );
}

export function Placeholder({ height = 160, label = 'Loading' }: { height?: number; label?: string }) {
  return (
    <div className="placeholder" style={{ minHeight: height }} aria-busy="true">
      <span className="eyebrow">{label}…</span>
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error'; children: ReactNode }) {
  return <p className={`notice notice--${tone}`}>{children}</p>;
}

export function ViaNote({ via }: { via: DataPath }) {
  if (via === 'server') return null;
  return (
    <span
      className="via"
      title="The server's shared quota is exhausted, so your browser fetched this directly from Open-Meteo."
    >
      direct from Open-Meteo
    </span>
  );
}

/** A snow amount on the glacier ramp, used in heat tables and bars. */
export function SnowCell({ cm, children }: { cm: number | null | undefined; children: ReactNode }) {
  const step = snowStep(cm);
  return <td className={`heat heat--${step < 0 ? 'na' : step}`}>{children}</td>;
}

interface BoundaryState {
  error: unknown;
}

class ErrorBoundary extends Component<
  { children: ReactNode; fallback: (error: unknown) => ReactNode },
  BoundaryState
> {
  override state: BoundaryState = { error: null };
  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error };
  }
  override render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}

/** Suspense + error boundary: one section failing never takes down the page. */
export function Boundary({
  children,
  height,
  label,
}: {
  children: ReactNode;
  height?: number;
  label?: string;
}) {
  return (
    <ErrorBoundary fallback={err => <Notice tone="error">{describeError(err)}</Notice>}>
      <Suspense fallback={<Placeholder {...(height ? { height } : {})} {...(label ? { label } : {})} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
