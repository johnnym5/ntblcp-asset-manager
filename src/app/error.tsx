'use client';

/**
 * @fileOverview Root Error Boundary Fallback.
 * Phase 105: Synchronized with high-fidelity Resilience Terminal.
 */

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/ErrorFallback';
import { monitoring } from '@/lib/monitoring';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    monitoring.trackError(error, { module: 'Root Error Boundary', action: 'CRASH' }, 'CRITICAL');
  }, [error]);

  return (
    <ErrorFallback 
      error={error} 
      resetErrorBoundary={reset} 
      isGlobal 
    />
  );
}
