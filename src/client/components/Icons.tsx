import type { Sky } from '../lib/weather';

interface IconProps {
  size?: number;
  className?: string;
  title?: string;
}

const svgProps = (size: number, title?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  role: title ? 'img' : undefined,
  'aria-hidden': title ? undefined : true,
  'aria-label': title,
});

/** Brand mark: nested contour lines climbing to a summit, with the signal-red flag of a patrol marker. */
export function BrandMark({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M2 27 16 6l14 21" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path
        d="M8.5 27 16 15.5 23.5 27"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M16 6V1.5l5 2.2-5 2.3"
        fill="var(--signal)"
        stroke="var(--signal)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CLOUD_HIGH = 'M7.5 14.5h9.2a3.6 3.6 0 0 0 .3-7.2 5.2 5.2 0 0 0-9.9 1.3 3 3 0 0 0 .4 5.9z';
const CLOUD = 'M7.5 18h9.4a3.8 3.8 0 0 0 .3-7.6 5.4 5.4 0 0 0-10.2 1.4 3.1 3.1 0 0 0 .5 6.2z';

export function WeatherIcon({
  sky,
  night = false,
  size = 24,
  title,
}: IconProps & { sky: Sky; night?: boolean }) {
  const p = svgProps(size, title);
  switch (sky) {
    case 'clear':
      return night ? (
        <svg {...p}>
          <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />
        </svg>
      ) : (
        <svg {...p}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </svg>
      );
    case 'partly':
      return (
        <svg {...p}>
          <path d="M8 3.5v1.4M3.5 8h1.4M4.8 4.8l1 1M11.2 4.8l-1 1" />
          <path d="M10.8 8.6A3.2 3.2 0 0 0 5.3 9.9" />
          <path d={CLOUD} />
        </svg>
      );
    case 'fog':
      return (
        <svg {...p}>
          <path d={CLOUD_HIGH} />
          <path d="M4 17.5h16M6 20.5h12" />
        </svg>
      );
    case 'drizzle':
      return (
        <svg {...p}>
          <path d={CLOUD_HIGH} />
          <path d="M8.5 17.5v.5M12 18.5v.5M15.5 17.5v.5M10 21v.3M14 21v.3" />
        </svg>
      );
    case 'rain':
      return (
        <svg {...p}>
          <path d={CLOUD_HIGH} />
          <path d="m8.5 17-1 3M12.5 17l-1 3M16.5 17l-1 3" />
        </svg>
      );
    case 'freezing':
      return (
        <svg {...p}>
          <path d={CLOUD_HIGH} />
          <path d="m8 17-.8 2.6M15.5 17l-.8 2.6" />
          <path d="M11.5 18.5h.01M11 21.5h.01" strokeWidth="2.4" />
        </svg>
      );
    case 'snow':
    case 'heavy-snow':
      return (
        <svg {...p}>
          <path d={CLOUD_HIGH} />
          <Flake x={8.5} y={18.5} />
          <Flake x={15.5} y={18.5} />
          {sky === 'heavy-snow' && <Flake x={12} y={21.2} />}
        </svg>
      );
    case 'storm':
      return (
        <svg {...p}>
          <path d={CLOUD_HIGH} />
          <path d="m12.5 15.5-2 3.2h3l-2 3.3" />
        </svg>
      );
    case 'cloudy':
      return (
        <svg {...p}>
          <path d={CLOUD} />
        </svg>
      );
  }
}

function Flake({ x, y }: { x: number; y: number }) {
  const r = 1.6;
  return (
    <path
      d={`M${x - r} ${y}h${2 * r}M${x - r * 0.5} ${y - r * 0.87}l${r} ${r * 1.73}M${x + r * 0.5} ${y - r * 0.87}l${-r} ${r * 1.73}`}
      strokeWidth="1.2"
    />
  );
}

export function StarIcon({ filled, size = 16 }: IconProps & { filled: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WindArrow({ degrees, size = 14 }: { degrees: number; size?: number }) {
  // Meteorological direction is where wind comes FROM; the arrow points where it blows TO.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ transform: `rotate(${degrees + 180}deg)` }}
    >
      <path
        d="M12 3v17M6 14l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
