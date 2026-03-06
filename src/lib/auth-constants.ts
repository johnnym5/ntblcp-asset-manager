/**
 * @fileOverview Authentication constants for the initial setup user.
 * These are now loaded from environment variables to keep your source code secure on GitHub.
 */

/**
 * Returns the admin credentials.
 * Defaults are provided for local development, but should be overridden in production
 * using NEXT_PUBLIC_INITIAL_ADMIN_USER and NEXT_PUBLIC_INITIAL_ADMIN_PASSWORD.
 */
export const getInitialAdminCreds = () => {
  return {
    u: process.env.NEXT_PUBLIC_INITIAL_ADMIN_USER || 'admin',
    p: process.env.NEXT_PUBLIC_INITIAL_ADMIN_PASSWORD || 'setup'
  };
};
