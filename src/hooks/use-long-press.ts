'use client';

import { useCallback, useRef } from 'react';

/**
 * @fileOverview useLongPress - High-Fidelity Interaction Hook.
 * Provides deterministic hold detection for mobile and desktop workstations.
 */

export function useLongPress(callback: () => void, ms = 500) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isHolding = useRef(false);

  const start = useCallback((event: any) => {
    // Prevent context menu from standard right click if we use that instead
    isHolding.current = true;
    timerRef.current = setTimeout(() => {
      if (isHolding.current) {
        callback();
      }
    }, ms);
  }, [callback, ms]);

  const stop = useCallback(() => {
    isHolding.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}