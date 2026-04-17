/**
 * @fileOverview Unified Domain Models for Assetain.
 * Authoritative type definitions for the entire asset management system.
 * Updated Phase 1940: Added missing technical fields to the Asset interface.
 */

import { type Dispatch, type SetStateAction } from 'react';
import type { RegistryHeader } from './registry';

export type UserRole = 'ADMIN' | 'MANAGER' | 'VERIFIER' | 'VIEWER' | 'SUPERADMIN';
export type VerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'DISCREPANCY';
export type ConditionGroup = 'Good' | 'Bad' | 'Stolen' | 'Obsolete' | 'Unsalvageable' | 'Discrepancy';
export type DataSource = 'PRODUCTION' | 'SANDBOX';
export type UXMode = 'beginner' | 'advanced';
export type StorageLayer = 'FIRESTORE' | 'RTDB' | 'LOCAL';
export type AuthorityNode = 'FIRESTORE' | 'RTDB';
export type SyncStatus = 'synced' | 'local';
export type SyncStrategy = 'UPDATE' | 'SKIP';

export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
export type LocationMatchStatus = 'MATCHED' | 'PARTIAL' | 'UNASSIGNED' | 'NEEDS_REVIEW' | 'INVALID';

export type ValidationGroup = 'electronics' | 'vehicles' | 'furniture' | 'medical' | 'infrastructure' | 'unknown';

export type WorkstationView = 
  | 'DASHBOARD' 
  | 'REGISTRY' 
  | 'GROUPS'
  | 'IMPORT' 
  | 'REPORTS' 
  | 'ALERTS' 
  | 'AUDIT_LOG' 
  | 'SYNC_QUEUE' 
  | 'USERS' 
  | 'INFRASTRUCTURE' 
  | 'DATABASE' 
  | 'SETTINGS'
  | 'ANOMALIES';

export interface UserPermissions {
  // Page Access
  page_dashboard: boolean;
  page_registry: boolean;
  page_groups: boolean;
  page_reports: boolean;
  page_alerts: boolean;
  page_audit_log: boolean;
  page_sync_queue: boolean;
  page_users: boolean;
  page_infrastructure: boolean;
  page_database: boolean;
  page_settings: boolean;
  // Function Access
  func_add_asset: boolean;
  func_edit_asset: boolean;
  func_delete_asset: boolean;
  func_import: boolean;
  func_batch_edit: boolean;
  func_edit_headers: boolean;
  func_revert: boolean;
  func_approve: boolean;
}

export interface OptionType {
  label: string;
  value: string;
  count?: number;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataActions {
  onImport?: () => void;
  onScanAndImport?: () => void;
  onExport?: () => void;
  onAddAsset?: () => void;
  onClearAll?: () => void;
  onTravelReport?: () => void;
  isImporting?: boolean;
}

export interface SectionHierarchy {
  document: string;
  section: string;
  subsection: string;
  assetFamily: string;
}

export interface ImportMetadata {
  sourceFile: string;
  sheetName: string;
  rowNumber: number;
  importedAt: string;
}

export interface ConditionAuditEntry {
  oldCondition: string;
  newCondition: string;
  changedBy: string;
  timestamp: string;
  reason: string;
  isBulkAction: boolean;
}

export interface AssetClassification {
  group: string;
  subgroup: string;
  type: string;
  brand: string;
  normalizedLabel: string;
  conditionBucket: string;
  yearBucket: number | null;
  isTransfer: boolean;
  transferSource: string | null;
  validationGroup: ValidationGroup;
}

export type DiscrepancySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DiscrepancyStatus = 'PENDING' | 'SUSPICIOUS' | 'NEEDS_REVIEW' | 'IGNORED' | 'CORRECTED' | 'RESOLVED';

export interface AssetDiscrepancy {
  id: string;
  field: string;
  originalValue: any;
  suggestedValue?: any;
  reason: string;
  severity: DiscrepancySeverity;
  confidence: MatchConfidence;
  status: DiscrepancyStatus;
  flaggedAt: string;
}

export interface Asset {
  id: string;
  sn?: string; 
  name?: string;
  description: string;
  category: string;
  grantId: string; 
  
  // Data Synchronization Status
  syncStatus?: SyncStatus;

  // Hierarchical Context
  section: string;
  subsection: string;
  assetFamily: string;
  
  // Location & Assignment
  location: string; 
  normalizedLocation?: string;
  normalizedState?: string;
  normalizedZone?: string;
  normalizedLga?: string;
  locationConfidence?: MatchConfidence;
  locationStatus?: LocationMatchStatus;
  
  custodian: string;
  lga?: string;
  site?: string;
  
  // State & Assessment
  status: VerificationStatus;
  condition: string;
  conditionGroup: ConditionGroup;
  conditionNotes?: string;
  conditionHistory?: ConditionAuditEntry[];
  discrepancyFlag?: boolean;
  reviewStatus?: 'PENDING' | 'RESOLVED' | 'FLAGGED';
  
  discrepancies: AssetDiscrepancy[];
  overallFidelityScore: number;

  // Financial & Technical
  purchaseDate?: string;
  value: number;
  purchasePriceUsd?: number;
  serialNumber: string;
  assetIdCode?: string;
  manufacturer?: string;
  modelNumber?: string;
  chassisNo?: string;
  engineNo?: string;
  supplier?: string;
  remarks?: string;
  grnNo?: string;
  pvNo?: string;
  pvJvNo?: string;
  usefulLifeYears?: string;
  funder?: string;
  
  classification?: AssetClassification;

  hierarchy: SectionHierarchy;
  importMetadata: ImportMetadata;
  metadata: Record<string, unknown>;
  
  lastModified: string;
  lastModifiedBy: string;
  lastModifiedByState?: string;

  updateCount: number;
  unseenUpdateFields: string[];
  previousState?: Partial<Asset> | null;
  
  sourceGroup?: string;
  sourceColumnAGroup?: string;
  templateId?: string;

  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  pendingChanges?: Partial<Asset>;
  changeSubmittedBy?: {
    displayName: string;
    loginName: string;
    state: string;
  };
  adminComment?: string;
  yearBucket?: number;
}

export interface DisplayField {
  key: keyof Asset;
  label: string;
  table: boolean;
  quickView: boolean;
  inChecklist?: boolean;
}

export interface SheetDefinition {
  name: string;
  headers: string[];
  displayFields: DisplayField[];
}

export interface Grant {
  id: string;
  name: string;
  enabledSheets: string[];
  sheetDefinitions: Record<string, SheetDefinition>;
}

export interface SyncSummary {
  type: 'DOWNLOAD' | 'UPLOAD';
  newItems: Asset[];
  existingItems: Asset[];
  totalCount: number;
}

export interface AppSettings {
  version: number;
  authorizedUsers: AuthorizedUser[];
  lockAssetList: boolean;
  appMode: 'management' | 'verification';
  readAuthority: AuthorityNode;
  activeGrantIds: string[]; // Enabled multiple projects
  grants: Grant[];
  uxMode: UXMode;
  onboardingComplete: boolean;
  showHelpTooltips: boolean;
  sourceBranding: Record<string, string>;
  globalHeaders?: RegistryHeader[];
}

export interface AuthorizedUser {
  loginName: string;
  displayName: string;
  email: string;
  password?: string;
  states: string[];
  role: UserRole;
  isAdmin: boolean;
  isSuperAdmin?: boolean; 
  isZonalAdmin?: boolean;
  assignedZone?: string;
  canAddAssets?: boolean;
  canEditAssets?: boolean;
  permissions?: UserPermissions;
}

export type QueueStatus = 'PENDING' | 'SYNCING' | 'FAILED' | 'SUCCESS';
export type QueueOperation = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'DISCREPANCY_RESOLVED' | 'DISCREPANCY_IGNORED';

export interface OfflineQueueEntry {
  id: string;
  operation: QueueOperation;
  collection: string;
  payload: Record<string, unknown>;
  status: QueueStatus;
  timestamp: number;
  error?: string;
}

export interface ActivityLogEntry {
  id: string;
  assetId: string;
  assetDescription: string;
  operation: QueueOperation | 'ACCESS_DENIED' | 'LOGIN';
  timestamp: string;
  performedBy: string;
  userState: string;
  roleContext?: UserRole;
  changes?: Record<string, { old: any; new: any }>;
  seenByUids?: string[];
  groupContext?: string;
  conditionContext?: string;
  details?: string;
}

export type ErrorSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type ErrorLogStatus = 'PENDING' | 'RESOLVED' | 'IGNORED';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  status: ErrorLogStatus;
  user: { id: string; name: string; role: string; };
  context: { 
    page: string; 
    module: string; 
    action: string; 
    isOnline: boolean;
    browser: string;
  };
  error: { 
    type: string; 
    message: string;
    technicalMessage: string; 
    laymanExplanation: string; 
    stack?: string; 
  };
  recovery: { 
    attempted: boolean; 
    action?: string; 
    result?: string; 
  };
  adminComment?: string;
}
