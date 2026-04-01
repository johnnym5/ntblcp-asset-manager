/**
 * @fileOverview RBAC (Role-Based Access Control) Engine.
 * Phase 82: Hardened Zonal Manager scope inheritance logic.
 */

import type { AuthorizedUser, Asset, Action } from '@/types/domain';
import { NIGERIAN_ZONES } from '@/lib/constants';

/**
 * Checks if a user has the base permission for an action.
 */
export function hasPermission(user: AuthorizedUser, action: string): boolean {
  const role = user.role;

  switch (action) {
    case 'DATABASE_MISSION_CONTROL':
      return !!user.isSuperAdmin || role === 'SUPERADMIN';

    case 'MANAGE_USERS':
    case 'EDIT_CONFIG':
    case 'DELETE_ASSET':
    case 'INFRASTRUCTURE_CONTROL':
      return role === 'ADMIN' || role === 'SUPERADMIN';

    case 'ADD_ASSET':
    case 'EDIT_ASSET':
    case 'VIEW_REPORTS':
    case 'IMPORT_CENTER':
      return role === 'ADMIN' || role === 'MANAGER' || role === 'SUPERADMIN';

    case 'VERIFY_ASSET':
      return role !== 'VIEWER';

    default:
      return false;
  }
}

/**
 * Validates if an operation on a specific asset is within the user's regional scope.
 * Supports State-level and Zonal-level inheritance.
 */
export function isWithinScope(user: AuthorizedUser, asset: Asset): boolean {
  // Admins or users with global scope bypass regional checks
  if (user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.states.includes('All')) {
    return true;
  }

  const assetLocation = (asset.location || '').trim().toLowerCase();
  
  // 1. Direct State Match
  if (user.states.some(s => s.toLowerCase() === assetLocation)) {
    return true;
  }

  // 2. Zonal Inheritance Check
  // If a user is assigned a Geopolitical Zone (e.g. "North Central"), 
  // they have scope for all states within that zone.
  for (const assignedScope of user.states) {
    const zoneStates = NIGERIAN_ZONES[assignedScope];
    if (zoneStates && zoneStates.some(s => s.toLowerCase() === assetLocation)) {
      return true;
    }
  }

  return false;
}

/**
 * Aggregated check for UI and Service layers.
 * Evaluates both role-based and scope-based constraints.
 */
export function canPerform(user: AuthorizedUser, action: string, asset?: Asset): boolean {
  if (!hasPermission(user, action)) return false;
  if (asset && !isWithinScope(user, asset)) return false;
  return true;
}
