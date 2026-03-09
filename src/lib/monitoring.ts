/**
 * @fileOverview Professional Error Monitoring Service
 * 
 * Mimics behavior of tools like Sentry or LogRocket.
 * Captures stack traces, user context, and system metadata.
 */

'use client';

export interface ErrorContext {
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

    // Catch unhandled global errors
    window.addEventListener('error', (event) => {
      this.trackError(event.error, { context: 'Global Window Error' });
    });

    // Catch unhandled promise rejections (very common in async Firebase calls)
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(event.reason, { context: 'Unhandled Promise Rejection' });
    });

    this.isInitialized = true;
    console.log("🚀 Monitoring Service Initialized");
  }

  /**
   * Captures and reports an error with full metadata.
   */
  trackError(error: any, context: ErrorContext = {}) {
    if (typeof window === 'undefined') return;

    const errorPayload = {
      timestamp: new Date().toISOString(),
      message: error?.message || String(error),
      code: error?.code || 'N/A',
      stack: error?.stack || 'N/A',
      context: {
        ...context,
        browser: navigator.userAgent,
        language: navigator.language,
        url: window.location.href,
        connection: (navigator as any).connection?.effectiveType || 'unknown',
      }
    };

    // In a real production app, this would use fetch() to send data to Sentry/Datadog
    // For now, we log a structured, high-visibility report to the console
    console.group(`🛑 MONITORING REPORT: ${errorPayload.message}`);
    console.table({
      Code: errorPayload.code,
      Component: context.component || 'Unknown',
      Action: context.action || 'Unknown',
      User: context.userName || 'Anonymous',
    });
    console.log("Full Payload:", errorPayload);
    console.groupEnd();

    // Placeholder for actual SaaS integration:
    // Sentry.captureException(error, { extra: errorPayload.context });
  }

  trackEvent(name: string, data: any) {
    // Logic for tracking user behavior/session events
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 EVENT: ${name}`, data);
    }
  }
}

export const monitoring = new MonitoringService();
