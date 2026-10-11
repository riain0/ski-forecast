import { elevationFor } from '#shared/destinations';
import type { ElevationBand } from '#shared/types';
import type { Formatters } from '../../lib/format';
import type { Place } from '../../lib/place';

const BANDS: { band: ElevationBand; label: string; y: number }[] = [
  { band: 'summit', label: 'Summit', y: 14 },
  { band: 'mid', label: 'Mid', y: 47 },
  { band: 'base', label: 'Base', y: 80 },
];

/** Forecast elevation picker drawn as a mountain profile, so the choice reads as "where on the hill". */
export function ElevationPicker({
  place,
  band,
  onChange,
  f,
}: {
  place: Place;
  band: ElevationBand;
  onChange: (b: ElevationBand) => void;
  f: Formatters;
}) {
  const current = BANDS.find(b => b.band === band) ?? BANDS[1]!;
  const halfWidthAt = (y: number) => ((y - 8) / 82) * 58;
  return (
    <div className="elev" role="radiogroup" aria-label="Forecast elevation">
      <svg className="elev__mtn" viewBox="0 0 132 92" aria-hidden="true">
        <path d="M4 90 66 8l62 82z" className="elev__shape" />
        <path d="M52 26.5 66 8l14 18.5-6 3-4-3-4 4-4-4-4 3z" className="elev__cap" />
        {BANDS.map(b => (
          <line
            key={b.band}
            x1={66 - halfWidthAt(b.y)}
            x2={66 + halfWidthAt(b.y)}
            y1={b.y}
            y2={b.y}
            className="elev__tick"
          />
        ))}
        <line x1={0} x2={132} y1={current.y} y2={current.y} className="elev__now" />
      </svg>
      <div className="elev__options">
        {BANDS.map(b => (
          <button
            key={b.band}
            type="button"
            role="radio"
            aria-checked={b.band === band}
            className={b.band === band ? 'is-on' : undefined}
            onClick={() => onChange(b.band)}
          >
            <span>{b.label}</span>
            <span className="mono">{f.height(elevationFor(place, b.band))}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
