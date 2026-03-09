/**
 * @fileOverview Centralized logging utility for Assetain.
 * Integrated with the Monitoring Service for production tracking.
 */

import { monitoring } from "./monitoring";

export const logger = {
  log: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },
  error: (message: string, error?: any, context?: any) => {
    // Log to console for local debugging
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, error);

    // Automatically report to high-level monitoring
    monitoring.trackError(error || new Error(message), {
      message,
      ...context
    });
  }
};
