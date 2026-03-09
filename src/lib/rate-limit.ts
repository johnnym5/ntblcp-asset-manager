/**
 * Simple client-side rate limiting utility to prevent spamming high-impact operations.
 */

interface RateLimitState {
  lastExecution: number;
}

const rateLimitRegistry = new Map<string, RateLimitState>();

/**
 * Checks if an operation is allowed based on a cooldown window.
 * @param key Unique key for the operation (e.g., 'sync-upload')
 * @param windowMs Minimum time in milliseconds between executions
 * @returns boolean True if allowed, false if rate-limited
 */
export function isAllowed(key: string, windowMs: number = 2000): boolean {
  const now = Date.now();
  const state = rateLimitRegistry.get(key);

  if (!state || (now - state.lastExecution) > windowMs) {
    rateLimitRegistry.set(key, { lastExecution: now });
    return true;
  }

  return false;
}

/**
 * Returns the remaining cooldown time in seconds.
 */
export function getRemainingCooldown(key: string, windowMs: number): number {
  const state = rateLimitRegistry.get(key);
  if (!state) return 0;
  
  const remaining = windowMs - (Date.now() - state.lastExecution);
  return Math.max(0, Math.ceil(remaining / 1000));
}
