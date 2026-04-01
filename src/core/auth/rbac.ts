/**
 * @fileOverview RBAC (Role-Based Access Control) Engine.
 * Phase 180: Hardened Zonal Administrator scope inheritance logic.
 */

import type { AuthorizedUser, Asset } from '@/types/domain';
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
      return role === 'ADMIN' || role === 'MANAGER' || role === 'SUPERADMIN' || !!user.isZonalAdmin;

    case 'VERIFY_ASSET':
      return role !== 'VIEWER';

    default:
      return false;
  }
}

/**
 * Validates if an operation on a specific asset is within the user's regional scope.
 * Supports State-level, Zonal-level, and SuperAdmin global inheritance.
 */
export function isWithinScope(user: AuthorizedUser, asset: Asset): boolean {
  // 1. SuperAdmins and Admins bypass regional checks
  if (user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.states.includes('All') || user.isAdmin) {
    return true;
  }

  const assetLocation = (asset.location || '').trim().toLowerCase();
  
  // 2. Direct State Match
  if (user.states.some(s => s.toLowerCase() === assetLocation)) {
    return true;
  }

  // 3. Zonal Administrator Check
  // If a user is a Zonal Admin, we check if the asset's state falls within their assigned zone
  if (user.isZonalAdmin && user.assignedZone) {
    const zoneStates = NIGERIAN_ZONES[user.assignedZone];
    if (zoneStates && zoneStates.some(s => s.toLowerCase() === assetLocation)) {
      return true;
    }
  }

  // 4. Fallback: Secondary check for users assigned multiple specific states via zones
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
