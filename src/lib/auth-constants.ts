
/**
 * @fileOverview Obfuscated authentication constants for the initial setup user.
 * Note: These are Base64 encoded to prevent plaintext discovery in source code.
 */

// 'admin'
const _u = 'YWRtaW4='; 
// 'setup'
const _p = 'c2V0dXA='; 

/**
 * Decodes the obfuscated admin credentials.
 * This is used for the initial bootstrap account before permanent users are created.
 */
export const getInitialAdminCreds = () => {
  if (typeof window === 'undefined') return { u: '', p: '' };
  return {
    u: window.atob(_u),
    p: window.atob(_p)
  };
};
