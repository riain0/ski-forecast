import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

export type Route =
  | { name: 'board' }
  | { name: 'map' }
  | { name: 'method' }
  | { name: 'destination'; id: string }
  | { name: 'spot'; lat: number; lon: number; elevation: number; label: string }
  | { name: 'not-found' };

export function parseRoute(pathname: string, search = ''): Route {
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const [head, id] = parts;
  if (!head) return { name: 'board' };
  if (head === 'map' && parts.length === 1) return { name: 'map' };
  if (head === 'method' && parts.length === 1) return { name: 'method' };
  if (head === 'mountain' && id) return { name: 'destination', id };
  if (head === 'spot') {
    const q = new URLSearchParams(search);
    const lat = Number(q.get('lat'));
    const lon = Number(q.get('lon'));
    const elevation = Number(q.get('elev'));
    if (Number.isFinite(lat) && Number.isFinite(lon) && Number.isFinite(elevation)) {
      return { name: 'spot', lat, lon, elevation, label: q.get('name') ?? 'Custom spot' };
    }
  }
  return { name: 'not-found' };
}

export const hrefFor = {
  board: () => '/',
  map: () => '/map',
  method: () => '/method',
  destination: (id: string) => `/mountain/${encodeURIComponent(id)}`,
  spot: (s: { lat: number; lon: number; elevation: number; name: string }) =>
    `/spot?${new URLSearchParams({ lat: s.lat.toFixed(4), lon: s.lon.toFixed(4), elev: String(Math.round(s.elevation)), name: s.name }).toString()}`,
};

const listeners = new Set<() => void>();
window.addEventListener('popstate', () => listeners.forEach(l => l()));

export function navigate(href: string): void {
  if (href === location.pathname + location.search) return;
  history.pushState(null, '', href);
  window.scrollTo(0, 0);
  listeners.forEach(l => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useLocation(): string {
  return useSyncExternalStore(subscribe, () => location.pathname + location.search);
}

/** An anchor that navigates client-side for plain left clicks. */
export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  };
  return <a href={href} onClick={handle} {...rest} />;
}
