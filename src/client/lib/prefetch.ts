import { prefetchOverview, prefetchPlace } from '../api/data';
import { loadPage } from './pages';
import { placeFromRoute, pointFor } from './place';
import { getPrefs } from './prefs';
import { parseRoute } from './routes';

/**
 * How long the pointer must rest on a link before we prefetch. Mountain pages cost forecast quota per
 * mountain, so they need a more deliberate hover than the nav tabs; passing over rows prefetches nothing.
 */
const HOVER_INTENT_MS = { page: 100, place: 250 };

const saveData = () =>
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

const ignore = () => undefined;

const routeOf = (href: string) => {
  const url = new URL(href, location.origin);
  return url.origin === location.origin ? parseRoute(url.pathname, url.search) : null;
};

/**
 * Loads what an in-app URL needs before it's clicked: the page's code and the data for its first screen.
 * Safe to call repeatedly: chunks load once, and each query is cached under its own key.
 */
export function prefetch(href: string): void {
  if (saveData()) return;
  const route = routeOf(href);
  if (!route) return;

  switch (route.name) {
    case 'board':
      prefetchOverview();
      return;
    case 'map':
      loadPage.map().catch(ignore);
      prefetchOverview();
      return;
    case 'method':
      loadPage.method().catch(ignore);
      return;
    case 'destination':
    case 'spot': {
      const place = placeFromRoute(route);
      if (!place) return;
      loadPage.destination().catch(ignore);
      prefetchPlace(pointFor(place, getPrefs().band), { lat: place.lat, lon: place.lon }, place.country);
      return;
    }
    case 'not-found':
      return;
  }
}

/** Starts a prefetch after the hover-intent delay for this kind of page; returns a cancel function. */
export function prefetchOnHover(href: string): () => void {
  const name = routeOf(href)?.name;
  const delay = name === 'destination' || name === 'spot' ? HOVER_INTENT_MS.place : HOVER_INTENT_MS.page;
  const timer = setTimeout(() => prefetch(href), delay);
  return () => clearTimeout(timer);
}

/** Event props for a link: prefetch after a mouse hover, or immediately on keyboard focus or touch. */
export function prefetchIntent(href: string) {
  let cancel: (() => void) | undefined;
  return {
    onPointerEnter: (e: { pointerType: string }) => {
      if (e.pointerType === 'mouse') cancel = prefetchOnHover(href);
    },
    onPointerLeave: () => cancel?.(),
    onFocus: () => prefetch(href),
    onTouchStart: () => prefetch(href),
  };
}
