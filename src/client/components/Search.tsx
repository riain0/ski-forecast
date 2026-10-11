import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { DESTINATIONS } from '#shared/destinations';
import type { GeocodeResult } from '#shared/types';
import { geocode } from '../api/data';
import { formatters } from '../lib/format';
import { setPrefs, usePrefs } from '../lib/prefs';
import { hrefFor, navigate } from '../lib/router';

interface Option {
  key: string;
  title: string;
  detail: string;
  href: string;
  save?: GeocodeResult;
}

export function Search() {
  const prefs = usePrefs();
  const f = formatters(prefs.units);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Results are tagged with their query so stale ones are ignored without resetting state in an effect.
  const [results, setResults] = useState<{ q: string; places: GeocodeResult[] }>({ q: '', places: [] });
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();

  const places = results.q === q ? results.places : [];
  const searching = q.length >= 3 && results.q !== q;

  useEffect(() => {
    if (q.length < 3) return;
    const timer = setTimeout(() => {
      geocode(q)
        .then(found => setResults({ q, places: found }))
        .catch(() => setResults({ q, places: [] }));
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  // "/" focuses search from anywhere, like most data tools.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const mountains: Option[] = q
    ? DESTINATIONS.filter(d =>
        `${d.name} ${d.group ?? ''} ${d.region} ${d.admin ?? ''}`.toLowerCase().includes(q),
      )
        .slice(0, 7)
        .map(d => ({
          key: d.id,
          title: d.name,
          detail: d.admin ? `${d.region} · ${d.admin}` : d.region,
          href: hrefFor.destination(d.id),
        }))
    : [];
  const saved: Option[] = prefs.spots
    .filter(s => !q || s.name.toLowerCase().includes(q))
    .slice(0, 5)
    .map(s => ({ key: s.id, title: s.name, detail: `Saved · ${s.label}`, href: hrefFor.spot(s) }));
  const found: Option[] = places.map(p => ({
    key: `${p.lat},${p.lon}`,
    title: p.name,
    detail: `${p.label} · ${f.height(p.elevation)}`,
    href: hrefFor.spot(p),
    save: p,
  }));
  const options = [...mountains, ...saved, ...found];

  const choose = (o: Option | undefined) => {
    if (!o) return;
    if (o.save) {
      const s = o.save;
      const id = `${s.lat.toFixed(4)},${s.lon.toFixed(4)}`;
      setPrefs(p => ({
        spots: [
          { id, name: s.name, label: s.label, lat: s.lat, lon: s.lon, elevation: s.elevation },
          ...p.spots.filter(x => x.id !== id),
        ].slice(0, 12),
      }));
    }
    navigate(o.href);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(a => Math.min(options.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(a => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      choose(options[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const group = (title: string, items: Option[], offset: number) =>
    items.length > 0 && (
      <li role="presentation">
        <div className="search__group">{title}</div>
        <ul role="presentation">
          {items.map((o, i) => (
            <li
              key={o.key}
              id={`${listId}-${offset + i}`}
              role="option"
              aria-selected={active === offset + i}
              className="search__option"
              onPointerDown={e => {
                e.preventDefault();
                choose(o);
              }}
              onPointerEnter={() => setActive(offset + i)}
            >
              <span>{o.title}</span>
              <span className="dim">{o.detail}</span>
            </li>
          ))}
        </ul>
      </li>
    );

  return (
    <div className="search">
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && options.length ? `${listId}-${active}` : undefined}
        aria-label="Search mountains, places, or coordinates"
        placeholder="Search mountains, towns, or lat, lon"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      <kbd className="search__kbd" aria-hidden="true">
        /
      </kbd>
      {open && (q || saved.length > 0) && (
        <ul id={listId} role="listbox" className="search__list">
          {group('On the pass', mountains, 0)}
          {group('Saved spots', saved, mountains.length)}
          {group('Anywhere', found, mountains.length + saved.length)}
          {searching && <li className="search__group">Searching places…</li>}
          {!searching && options.length === 0 && q && <li className="search__group">No matches</li>}
        </ul>
      )}
    </div>
  );
}
