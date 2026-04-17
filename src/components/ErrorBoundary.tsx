'use client';

/**
 * @fileOverview Higher-Order Component for Operational Safety.
 * Catches rendering crashes and reports them to the administrative audit ledger.
 */

import React, { ErrorInfo } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';
import { monitoring } from '@/lib/monitoring';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  module?: string;
  isGlobal?: boolean;
}

export function ErrorBoundary({ children, module = 'Application Shell', isGlobal = false }: ErrorBoundaryProps) {
  const handleError = (error: Error, info: ErrorInfo) => {
    monitoring.trackError(error, {
      module,
      action: 'RENDER_CRASH',
      componentStack: info.componentStack,
      recoveryAttempted: true,
      recoveryAction: 'ERROR_BOUNDARY_FALLBACK'
    }, 'CRITICAL');
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <ErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
          title={`${module} Failure`}
          isGlobal={isGlobal}
        />
      )}
      onReset={() => {
        // Safe module re-initialization
        monitoring.log(`Module ${module} recovering from error state`);
      }}
      onError={handleError}
    >
      {children}
    </ReactErrorBoundary>
  );
}
