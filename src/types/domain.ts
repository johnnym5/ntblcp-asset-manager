/**
 * @fileOverview Unified Domain Models for Assetain.
 * Strictly typed, deterministic models for registry management and system configuration.
 */

export type VerificationStatus = 'Verified' | 'Unverified' | 'Discrepancy';

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
  importedAt: string; // ISO 8601
}

export interface DisplayField {
  key: string;
  label: string;
  table: boolean;
  quickView: boolean;
  inChecklist?: boolean;
  checklistSection?: 'required' | 'important';
}

export interface SheetDefinition {
  name: string;
  headers: string[];
  displayFields: DisplayField[];
  subSheetTriggers?: string[];
}

export interface Grant {
  id: string;
  name: string;
  sheetDefinitions: Record<string, SheetDefinition>;
  enabledSheets: string[];
}

export interface AuthorizedUser {
  loginName: string;
  displayName: string;
  email: string;
  password?: string;
  states: string[];
  isAdmin: boolean;
  isZonalAdmin?: boolean;
  assignedZone?: string;
  isGuest?: boolean;
  canAddAssets?: boolean;
  canEditAssets?: boolean;
}

export interface AppSettings {
  grants: Grant[];
  activeGrantId: string | null;
  authorizedUsers: AuthorizedUser[];
  lockAssetList: boolean;
  appMode: 'management' | 'verification';
  activeDatabase: 'firestore' | 'rtdb';
  lastModified?: string;
}

export interface Asset {
  id: string;
  category: string;
  grantId?: string;
  
  // Dynamic Fields (mapped from Excel)
  sn?: string;
  description?: string;
  serialNumber?: string;
  assetIdCode?: string;
  location?: string;
  lga?: string;
  site?: string;
  assignee?: string;
  condition?: string;
  remarks?: string;
  
  // Custom Metadata
  metadata: Record<string, unknown>;
  hierarchy: SectionHierarchy;
  importMetadata: ImportMetadata;
  
  // System Status
  verifiedStatus: VerificationStatus;
  verifiedDate?: string;
  lastModified: string; // ISO 8601
  lastModifiedBy: string;
  lastModifiedByState?: string;
  syncStatus?: 'synced' | 'local' | 'syncing';
  
  // UI/Audit Buffer
  previousState?: Partial<Asset>;
  approvalStatus?: 'pending';
  pendingChanges?: Partial<Asset>;
  changeSubmittedBy?: {
    displayName: string;
    loginName: string;
    state: string;
  };
}

export type QueueOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type QueueStatus = 'PENDING' | 'PROCESSING' | 'FAILED';

export interface OfflineQueueEntry {
  id: string;
  operation: QueueOperation;
  collection: string;
  payload: Record<string, unknown>;
  status: QueueStatus;
  timestamp: number;
  error?: string;
}
