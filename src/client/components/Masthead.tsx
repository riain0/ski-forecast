import { setPrefs, usePrefs, type Theme } from '../lib/prefs';
import { Link, hrefFor, type Route } from '../lib/router';
import { BrandMark } from './Icons';
import { Search } from './Search';
import { Segmented } from './ui';

const NAV = [
  { name: 'board', label: 'Board', href: hrefFor.board() },
  { name: 'map', label: 'Map', href: hrefFor.map() },
  { name: 'method', label: 'Method', href: hrefFor.method() },
] as const;

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Day' },
  { value: 'dark', label: 'Night' },
];

export function Masthead({ route }: { route: Route }) {
  const prefs = usePrefs();
  return (
    <header className="masthead">
      <div className="masthead__inner">
        <Link href="/" className="brand" aria-label="Upslope, home">
          <BrandMark />
          <span className="brand__word">Upslope</span>
        </Link>
        <nav className="nav" aria-label="Primary">
          {NAV.map(n => (
            <Link key={n.name} href={n.href} aria-current={route.name === n.name ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <Search />
        <div className="masthead__controls">
          <Segmented
            size="sm"
            label="Units"
            value={prefs.units}
            onChange={units => setPrefs({ units })}
            options={[
              { value: 'us', label: 'in', title: 'Inches, °F, mph, feet' },
              { value: 'metric', label: 'cm', title: 'Centimetres, °C, km/h, metres' },
            ]}
          />
          <Segmented
            size="sm"
            label="Snow ratio"
            value={prefs.snowMode}
            onChange={snowMode => setPrefs({ snowMode })}
            options={[
              {
                value: 'auto',
                label: 'Auto',
                title: 'Snow-to-liquid ratio from temperature (≈8:1 wet to 17:1 cold smoke)',
              },
              { value: 'fixed', label: '10:1', title: 'Fixed 10:1 snow-to-liquid ratio' },
            ]}
          />
          <Segmented
            size="sm"
            label="Theme"
            value={prefs.theme}
            onChange={theme => setPrefs({ theme })}
            options={THEMES}
          />
        </div>
      </div>
    </header>
  );
}
