import { prefetchOverview } from '../api/data';
import { loadPage } from './pages';
import { parseRoute } from './routes';

/** Hover this long before prefetching, so passing the pointer over a link doesn't count as intent. */
const HOVER_INTENT_MS = 100;

const saveData = () =>
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

const ignore = () => undefined;

/**
 * Loads what an in-app URL needs before it's clicked: the page's code, plus the overview data for the
 * board and map. Mountain pages get their code only, since their forecasts cost quota per mountain.
 * Safe to call repeatedly: chunks load once and fresh cached data isn't refetched.
 */
export function prefetch(href: string): void {
  if (saveData()) return;
  const url = new URL(href, location.origin);
  if (url.origin !== location.origin) return;

  switch (parseRoute(url.pathname, url.search).name) {
    case 'board':
      prefetchOverview();
      break;
    case 'map':
      loadPage.map().catch(ignore);
      prefetchOverview();
      break;
    case 'method':
      loadPage.method().catch(ignore);
      break;
    case 'destination':
    case 'spot':
      loadPage.destination().catch(ignore);
      break;
    case 'not-found':
      break;
  }
}

/** Event props for a link: prefetch after a short mouse hover, or immediately on keyboard focus or touch. */
export function prefetchIntent(href: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    onPointerEnter: (e: { pointerType: string }) => {
      if (e.pointerType === 'mouse') timer = setTimeout(() => prefetch(href), HOVER_INTENT_MS);
    },
    onPointerLeave: () => clearTimeout(timer),
    onFocus: () => prefetch(href),
    onTouchStart: () => prefetch(href),
  };
}
