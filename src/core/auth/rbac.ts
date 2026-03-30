/**
 * @fileOverview RBAC (Role-Based Access Control) Engine.
 * Pure business logic for evaluating user permissions and regional scopes.
 */

import type { AuthorizedUser, UserRole, Asset } from '@/types/domain';
import { NIGERIAN_ZONES } from '@/lib/constants';

export type Action = 
  | 'MANAGE_USERS' 
  | 'EDIT_CONFIG' 
  | 'ADD_ASSET' 
  | 'EDIT_ASSET' 
  | 'DELETE_ASSET' 
  | 'VERIFY_ASSET'
  | 'VIEW_REPORTS';

/**
 * Checks if a user has the base permission for an action.
 * This is role-based and does not consider data-level scoping.
 */
export function hasPermission(user: AuthorizedUser, action: Action): boolean {
  const role = user.role;

  switch (action) {
    case 'MANAGE_USERS':
    case 'EDIT_CONFIG':
    case 'DELETE_ASSET':
      return role === 'ADMIN';

    case 'ADD_ASSET':
    case 'EDIT_ASSET':
    case 'VIEW_REPORTS':
      return role === 'ADMIN' || role === 'MANAGER';

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
  if (user.role === 'ADMIN' || user.states.includes('All')) return true;

  const assetLocation = asset.location || '';
  
  // 1. Direct State Match
  if (user.states.includes(assetLocation)) return true;

  // 2. Zonal Inheritance Check
  // If a user is assigned a Geopolitical Zone (e.g. "North Central"), 
  // they have scope for all states within that zone.
  for (const assignedStateOrZone of user.states) {
    const zoneStates = NIGERIAN_ZONES[assignedStateOrZone as keyof typeof NIGERIAN_ZONES];
    if (zoneStates && zoneStates.includes(assetLocation)) {
      return true;
    }
  }

  return false;
}

/**
 * Aggregated check for UI and Service layers.
 * Evaluates both role-based and scope-based constraints.
 */
export function canPerform(user: AuthorizedUser, action: Action, asset?: Asset): boolean {
  if (!hasPermission(user, action)) return false;
  if (asset && !isWithinScope(user, asset)) return false;
  return true;
}
