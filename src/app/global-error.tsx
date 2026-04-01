'use client';

/**
 * @fileOverview Global Error Boundary - The Absolute Safety Net.
 * Phase 105: Hardened for Resilience Terminal UI.
 */

import React from 'react';
import { ErrorFallback } from '@/components/ErrorFallback';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-[#0F172A] font-sans antialiased">
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={reset} 
          isGlobal 
          title="System Pulse Critical Failure"
        />
      </body>
    </html>
  );
}
