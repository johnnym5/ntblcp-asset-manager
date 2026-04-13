/**
 * @fileOverview RBAC (Role-Based Access Control) Engine.
 * Phase 181: Implemented Deterministic Fuzzy Matching for scope enforcement.
 * Phase 182: Unrestricted access for Administrative tiers.
 */

import type { AuthorizedUser, Asset, UserRole } from '@/types/domain';
import { LocationEngine } from '@/services/location-engine';
import { getFuzzySignature } from '@/lib/utils';

/**
 * Checks if a user has the base permission for an action.
 */
export function hasPermission(user: AuthorizedUser, action: string): boolean {
  const role = user.role as UserRole;

  // Global Administrative Bypass: Admins and SuperAdmins have full functional access
  if (role === 'SUPERADMIN' || role === 'ADMIN' || user.isAdmin) {
    return true;
  }

  switch (action) {
    case 'IMPORT_RECORDS':
    case 'BATCH_EDIT':
    case 'REVERT_CHANGES':
    case 'ADJUDICATE_REQUESTS':
      return role === 'MANAGER' || !!user.isZonalAdmin;

    case 'VIEW_REGISTRY':
    case 'VERIFY_ASSET':
    case 'EXPORT_REPORTS':
      return true;

    default:
      return false;
  }
}

/**
 * Validates if an operation on a specific asset is within the user's regional scope.
 * Uses normalized fuzzy matching to handle naming variations.
 */
export function isWithinScope(user: AuthorizedUser, asset: Asset): boolean {
  // 1. SuperAdmins and Global Admins bypass regional checks entirely
  if (user.role === 'SUPERADMIN' || user.states.includes('All')) {
    return true;
  }

  // 2. Resolve Asset Identity Fingerprints
  const assetLocationPulse = LocationEngine.normalize(asset.location);
  const assetStateFuzzy = getFuzzySignature(assetLocationPulse.state);
  const assetZoneFuzzy = getFuzzySignature(assetLocationPulse.zone);
  
  // 3. Directly Match User States (Fuzzy)
  const userStatesFuzzy = user.states.map(s => getFuzzySignature(s));
  if (userStatesFuzzy.includes(assetStateFuzzy)) {
    return true;
  }

  // 4. Zonal Administrator Check (Fuzzy)
  if (user.isZonalAdmin && user.assignedZone) {
    const userZoneFuzzy = getFuzzySignature(user.assignedZone);
    if (assetZoneFuzzy === userZoneFuzzy) {
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
