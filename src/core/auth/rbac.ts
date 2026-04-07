/**
 * @fileOverview RBAC (Role-Based Access Control) Engine.
 * Phase 180: Hardened Zonal Administrator scope inheritance logic.
 */

import type { AuthorizedUser, Asset, UserRole } from '@/types/domain';
import { NIGERIAN_GEO_DATA } from '@/lib/nigeria-geo';

/**
 * Checks if a user has the base permission for an action.
 */
export function hasPermission(user: AuthorizedUser, action: string): boolean {
  const role = user.role as UserRole;

  switch (action) {
    case 'DATABASE_ADMIN_TOOLS':
      return role === 'SUPERADMIN';

    case 'MANAGE_SYSTEM':
    case 'MANAGE_USERS':
    case 'EDIT_GLOBAL_CONFIG':
    case 'GLOBAL_WIPE':
      return role === 'ADMIN' || role === 'SUPERADMIN';

    case 'IMPORT_RECORDS':
    case 'BATCH_EDIT':
    case 'REVERT_CHANGES':
    case 'ADJUDICATE_REQUESTS':
      return role === 'ADMIN' || role === 'SUPERADMIN' || !!user.isZonalAdmin;

    case 'VIEW_REGISTRY':
    case 'VERIFY_ASSET':
    case 'EXPORT_REPORTS':
      return true; // Everyone can view/verify within their scope

    default:
      return false;
  }
}

/**
 * Validates if an operation on a specific asset is within the user's regional scope.
 */
export function isWithinScope(user: AuthorizedUser, asset: Asset): boolean {
  // 1. SuperAdmins and Admins bypass regional checks for Asset data
  if (user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.states.includes('All')) {
    return true;
  }

  const assetState = (asset.normalizedState || '').trim();
  const assetZone = (asset.normalizedZone || '').trim();
  
  // 2. Direct State Match
  if (user.states.some(s => s === assetState)) {
    return true;
  }

  // 3. Zonal Administrator Check
  if (user.isZonalAdmin && user.assignedZone) {
    if (assetZone === user.assignedZone) {
      return true;
    }
  }

  return false;
}

/**
 * Aggregated check for UI and Service layers.
 */
export function canPerform(user: AuthorizedUser, action: string, asset?: Asset): boolean {
  if (!hasPermission(user, action)) return false;
  if (asset && !isWithinScope(user, asset)) return false;
  return true;
}
