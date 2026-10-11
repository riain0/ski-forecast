/** URL ↔ route mapping, free of React and history side effects. */
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
