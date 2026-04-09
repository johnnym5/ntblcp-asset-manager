'use client';

import { useCallback, useRef } from 'react';

/**
 * @fileOverview useLongPress - High-Fidelity Interaction Hook.
 * Provides deterministic hold detection for mobile and desktop workstations.
 * Enhanced to pass the original event pulse for context menu triggers.
 */

export function useLongPress(callback: (e: any) => void, ms = 500) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isHolding = useRef(false);

  const start = useCallback((event: any) => {
    // Only trigger if it's a left click (button 0) or a touch event
    if (event.type === 'mousedown' && event.button !== 0) return;
    
    isHolding.current = true;
    timerRef.current = setTimeout(() => {
      if (isHolding.current) {
        callback(event);
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
