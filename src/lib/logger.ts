/**
 * @fileOverview Centralized Logging & Traceability Utility.
 */

import { monitoring } from "./monitoring";

export const logger = {
  info: (message: string, context?: any) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[INFO] ${message}`, context || '');
    }
  },
  warn: (message: string, context?: any) => {
    console.warn(`[WARN] ${message}`, context || '');
  },
  error: (message: string, error?: any, context?: any) => {
    console.error(`[ERROR] ${message}`, error);
    monitoring.trackError(error || new Error(message), {
      message,
      ...context
    });
  }
};
