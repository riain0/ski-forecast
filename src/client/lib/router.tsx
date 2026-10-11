import {
  useEffect,
  useLayoutEffect,
  useState,
  useTransition,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from 'react';
import { prefetchIntent } from './prefetch';

export { hrefFor, parseRoute, type Route } from './routes';

const here = () => location.pathname + location.search;
const listeners = new Set<() => void>();
let scrollOnCommit = false;
window.addEventListener('popstate', () => listeners.forEach(l => l()));

export function navigate(href: string): void {
  if (href === here()) return;
  history.pushState(null, '', href);
  scrollOnCommit = true;
  listeners.forEach(l => l());
}

/**
 * The current URL. Changes render as a transition, so React keeps the current page on screen until the
 * next one can render (its code loaded, its data cached) instead of flashing a loading placeholder.
 * `pending` is true while a navigation is waiting on something.
 */
export function useLocation(): { location: string; pending: boolean } {
  const [current, setCurrent] = useState(here);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const update = () => startTransition(() => setCurrent(here()));
    listeners.add(update);
    update(); // catch a change between first render and subscribing
    return () => {
      listeners.delete(update);
    };
  }, []);

  // Scroll once the new page is on screen, not when the click happens.
  useLayoutEffect(() => {
    if (!scrollOnCommit) return;
    scrollOnCommit = false;
    window.scrollTo(0, 0);
  }, [current]);

  return { location: current, pending };
}

/** An anchor that navigates client-side for plain left clicks and prefetches its page on intent. */
export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  };
  return <a href={href} onClick={handle} {...prefetchIntent(href)} {...rest} />;
}
