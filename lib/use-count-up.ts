'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts a figure up to its real value once, for the dashboard KPIs. Purely
 * presentational: it settles on exactly `target`, keeps the target's decimal
 * places, and jumps straight there under prefers-reduced-motion.
 */
export function useCountUp(target: number, duration = 900): string {
  const decimals = Number.isInteger(target) ? 0 : (String(target).split('.')[1] || '').length;
  const [value, setValue] = useState(() =>
    typeof window !== 'undefined' &&
    target !== 0 &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : target
  );
  const frame = useRef(0);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      target === 0
    ) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(t === 1 ? target : target * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value.toFixed(decimals);
}
