import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { prefetchIntent } from './prefetch';

export { hrefFor, parseRoute, type Route } from './routes';

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
