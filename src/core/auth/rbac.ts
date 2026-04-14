/**
 * @fileOverview RBAC (Role-Based Access Control) Engine.
 * Phase 181: Implemented Deterministic Fuzzy Matching for scope enforcement.
 * Phase 182: Unrestricted access for Administrative tiers.
 * Phase 183: Integrated granular UserPermissions pulse.
 */

import type { AuthorizedUser, Asset, UserRole, UserPermissions } from '@/types/domain';
import { LocationEngine } from '@/services/location-engine';
import { getFuzzySignature } from '@/lib/utils';

/**
 * Checks if a user has the base permission for an action.
 */
export function hasPermission(user: AuthorizedUser, action: string): boolean {
  const role = user.role as UserRole;

  // 1. Global Administrative Bypass: SuperAdmins have full functional access
  if (role === 'SUPERADMIN' || (user.isAdmin && user.role === 'SUPERADMIN')) {
    return true;
  }

  // 2. Check Granular Permissions if available
  if (user.permissions) {
    const p = user.permissions;
    switch (action) {
      case 'VIEW_DASHBOARD': return p.page_dashboard;
      case 'VIEW_REGISTRY': return p.page_registry;
      case 'VIEW_GROUPS': return p.page_groups;
      case 'VIEW_REPORTS': return p.page_reports;
      case 'VIEW_ALERTS': return p.page_alerts;
      case 'VIEW_HISTORY': return p.page_audit_log;
      case 'VIEW_SYNC': return p.page_sync_queue;
      case 'VIEW_PERSONNEL': return p.page_users;
      case 'VIEW_INFRASTRUCTURE': return p.page_infrastructure;
      case 'VIEW_DATABASE': return p.page_database;
      case 'VIEW_SETTINGS': return p.page_settings;
      
      case 'ADD_ASSET': return p.func_add_asset;
      case 'EDIT_ASSET': return p.func_edit_asset;
      case 'DELETE_ASSET': return p.func_delete_asset;
      case 'IMPORT_RECORDS': return p.func_import;
      case 'BATCH_EDIT': return p.func_batch_edit;
      case 'EDIT_HEADERS': return p.func_edit_headers;
      case 'REVERT_CHANGES': return p.func_revert;
      case 'ADJUDICATE_REQUESTS': return p.func_approve;
    }
  }

  // 3. Fallback Legacy Role Checks
  if (user.isAdmin || role === 'ADMIN') return true;

  switch (action) {
    case 'IMPORT_RECORDS':
    case 'BATCH_EDIT':
    case 'REVERT_CHANGES':
    case 'ADJUDICATE_REQUESTS':
      return role === 'MANAGER' || !!user.isZonalAdmin;

    case 'VIEW_REGISTRY':
    case 'VIEW_DASHBOARD':
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
