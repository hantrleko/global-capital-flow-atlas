import { useState, useEffect, useRef } from 'react';

/**
 * Institutional smooth numeric interpolation hook.
 * - Renders the exact initial value synchronously on mount (zero layout/SSR/test flash).
 * - Smoothly tweens over `duration` ms using cubic-bezier-like easeOutQuint on subsequent updates.
 * - Automatically respects `prefers-reduced-motion: reduce`.
 *
 * @param {number} targetValue
 * @param {number} duration - Animation duration in ms (default 260ms)
 * @returns {number}
 */
export function useAnimatedNumber(targetValue, duration = 260) {
  const numericTarget = typeof targetValue === 'number' && !Number.isNaN(targetValue) ? targetValue : 0;
  const [displayValue, setDisplayValue] = useState(numericTarget);
  const prevValueRef = useRef(numericTarget);
  const rafRef = useRef(null);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = numericTarget;

    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || duration <= 0 || typeof requestAnimationFrame !== 'function') {
      prevValueRef.current = endVal;
      setDisplayValue(endVal);
      return;
    }

    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // easeOutQuart for calm, tactile institutional deceleration
      const eased = 1 - Math.pow(1 - t, 4);
      const current = startVal + (endVal - startVal) * eased;

      if (t < 1) {
        setDisplayValue(current);
        rafRef.current = requestAnimationFrame(step);
      } else {
        prevValueRef.current = endVal;
        setDisplayValue(endVal);
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      prevValueRef.current = endVal;
    };
  }, [numericTarget, duration]);

  return displayValue;
}
