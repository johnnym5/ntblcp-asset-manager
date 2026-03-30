/**
 * @fileOverview Professional Error Monitoring & Event Tracking Service.
 * Implements standard observability patterns for traceability.
 */

'use client';

export interface TraceContext {
  component?: string;
  action?: string;
  userId?: string;
  userName?: string;
  [key: string]: any;
}

class MonitoringService {
  private isInitialized = false;

  init() {
    if (typeof window === 'undefined' || this.isInitialized) return;

    window.addEventListener('error', (event) => {
      this.trackError(event.error, { action: 'GLOBAL_WINDOW_ERROR' });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(event.reason, { action: 'UNHANDLED_PROMISE_REJECTION' });
    });

    this.isInitialized = true;
    console.log("🚀 Assetain Monitoring Service Initialized");
  }

  /**
   * Captures and reports an error with full system metadata.
   */
  trackError(error: any, context: TraceContext = {}) {
    if (typeof window === 'undefined') return;

    const errorPayload = {
      timestamp: new Date().toISOString(),
      message: error?.message || String(error),
      code: error?.code || 'N/A',
      stack: error?.stack || 'N/A',
      context: {
        ...context,
        browser: navigator.userAgent,
        url: window.location.href,
        connection: (navigator as any).connection?.effectiveType || 'unknown',
      }
    };

    // In production, this would send to Sentry or a custom logging endpoint.
    console.group(`🛑 TRACEABLE ERROR: ${errorPayload.message}`);
    console.table({
      Action: context.action || 'Unknown',
      Component: context.component || 'System',
      User: context.userName || 'Anonymous',
    });
    console.log("Trace Metadata:", errorPayload);
    console.groupEnd();
  }

  /**
   * Records a business event for the audit trail.
   */
  trackEvent(name: string, data: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 AUDIT EVENT [${name}]:`, data);
    }
  }
}

export const monitoring = new MonitoringService();
