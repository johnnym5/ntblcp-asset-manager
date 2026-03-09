/**
 * @fileOverview Centralized logging utility for Assetain.
 * Filters logs based on the environment to prevent leaking debug info in production.
 */

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
  error: (...args: unknown[]) => {
    // Error logging is preserved in production for diagnostic purposes
    // eslint-disable-next-line no-console
    console.error(...args);
  }
};
