import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Mounts children once the placeholder scrolls near the viewport, deferring expensive requests. */
export function InView({ children, minHeight }: { children: ReactNode; minHeight: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) setVisible(true);
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return visible ? <>{children}</> : <div ref={ref} style={{ minHeight }} aria-hidden="true" />;
}
