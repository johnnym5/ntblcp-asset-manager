/**
 * @fileOverview Authentication constants for the initial setup user.
 * These are kept in plain text for easier searchability and maintenance as requested.
 */

const _u = 'admin'; 
const _p = 'setup'; 

/**
 * Returns the admin credentials.
 * This is used for the initial bootstrap account before permanent users are created.
 */
export const getInitialAdminCreds = () => {
  return {
    u: _u,
    p: _p
  };
};
