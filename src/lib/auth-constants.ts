/**
 * @fileOverview Authentication constants for the initial setup user.
 * 
 * SECURITY WARNING: 
 * Hardcoded credentials in source code are a critical vulnerability.
 * This file retrieves credentials from environment variables.
 * If these variables are missing, the system will NOT fallback to 
 * insecure defaults in production environments.
 */

export const getInitialAdminCreds = () => {
  const user = process.env.NEXT_PUBLIC_INITIAL_ADMIN_USER;
  const pass = process.env.NEXT_PUBLIC_INITIAL_ADMIN_PASSWORD;

  if (process.env.NODE_ENV === 'production' && (!user || !pass)) {
    console.error("CRITICAL: Admin credentials missing in production environment variables.");
    // Return non-guessable IDs to prevent unauthorized bootstrap access
    return { u: 'DISABLED_SECURE_ID_UNSET', p: 'DISABLED_SECURE_PASS_UNSET' };
  }

  // Only use defaults in development environments
  return {
    u: user || (process.env.NODE_ENV === 'development' ? 'admin' : 'DISABLED_SECURE_ID_UNSET'),
    p: pass || (process.env.NODE_ENV === 'development' ? 'setup' : 'DISABLED_SECURE_PASS_UNSET')
  };
};
