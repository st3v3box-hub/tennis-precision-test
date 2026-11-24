import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

// Charts on the reports have fixed sizes so they print identically on A4,
// but on a phone they must fit the screen. These hooks give both.

/** true while the page is being printed (Crea PDF → stampa) */
export function usePrinting(): boolean {
  const [printing, setPrinting] = useState(() => {
    try { return window.matchMedia('print').matches; } catch { return false; }
  });
  useEffect(() => {
    // flushSync: the print layout is computed right after 'beforeprint',
    // so the A4 sizes must be on the page before the handler returns.
    const on = () => flushSync(() => setPrinting(true));
    const off = () => setPrinting(false);
    window.addEventListener('beforeprint', on);
    window.addEventListener('afterprint', off);
    let mq: MediaQueryList | null = null;
    const onChange = (e: MediaQueryListEvent) => (e.matches ? on() : off());
    try {
      mq = window.matchMedia('print');
      mq.addEventListener?.('change', onChange);
    } catch { /* old browser: before/afterprint are enough */ }
    return () => {
      window.removeEventListener('beforeprint', on);
      window.removeEventListener('afterprint', off);
      mq?.removeEventListener?.('change', onChange);
    };
  }, []);
  return printing;
}

/**
 * Width for a fixed-size chart: the A4 size when printing, otherwise the width of
 * the container (never more than the A4 size). Attach `ref` to the container.
 */
export function useFitWidth<T extends HTMLElement = HTMLDivElement>(printWidth: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState<number | null>(null);
  const printing = usePrinting();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fitted = printing || !width ? printWidth : Math.min(printWidth, width);
  return { ref, width: fitted };
}
