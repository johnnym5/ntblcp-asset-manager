/**
 * @fileOverview Unified Domain Models for Assetain.
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'VERIFIER' | 'VIEWER' | 'SUPERADMIN';
export type VerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'DISCREPANCY';
export type DataSource = 'PRODUCTION' | 'SANDBOX';
export type UXMode = 'beginner' | 'advanced';
export type StorageLayer = 'FIRESTORE' | 'RTDB' | 'LOCAL';
export type AuthorityNode = 'FIRESTORE' | 'RTDB';

export type WorkstationView = 
  | 'DASHBOARD' 
  | 'REGISTRY' 
  | 'IMPORT' 
  | 'VERIFY' 
  | 'REPORTS' 
  | 'ALERTS' 
  | 'AUDIT_LOG' 
  | 'SYNC_QUEUE' 
  | 'USERS' 
  | 'INFRASTRUCTURE' 
  | 'DATABASE' 
  | 'SETTINGS'
  | 'GIS';

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

export interface Geotag {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
}

export interface Asset {
  id: string;
  name?: string;
  description: string;
  category: string;
  grantId: string; 
  
  // Hierarchical Context
  section: string;
  subsection: string;
  assetFamily: string;
  
  // Location & Assignment
  location: string;
  custodian: string;
  lga?: string;
  
  // State & Assessment
  status: VerificationStatus;
  condition: string;
  
  // Financial & Technical
  purchaseDate?: string;
  value: number; // NGN
  serialNumber: string;
  assetIdCode?: string;
  manufacturer?: string;
  modelNumber?: string;
  chassisNo?: string;
  engineNo?: string;
  supplier?: string;
  remarks?: string;
  
  geotag?: Geotag;

  // Depreciation Pulse (TB Specific)
  depreciation?: {
    ngn: Record<string, number>;
    usd: Record<string, number>;
  };

  // Metadata & Traceability
  hierarchy: SectionHierarchy;
  importMetadata: ImportMetadata;
  metadata: Record<string, unknown>;
  
  // System Fields
  lastModified: string;
  lastModifiedBy: string;
  lastModifiedByState?: string;

  // Restoration Buffer
  previousState?: Partial<Asset> | null;
  
  // Governance
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  pendingChanges?: Partial<Asset>;
  changeSubmittedBy?: {
    displayName: string;
    loginName: string;
    state: string;
  };
  yearBucket?: number;
}

export interface AppSettings {
  authorizedUsers: AuthorizedUser[];
  lockAssetList: boolean;
  appMode: 'management' | 'verification';
  readAuthority: AuthorityNode;
  activeGrantId: string | null;
  grants: Grant[];
  uxMode: UXMode;
  onboardingComplete: boolean;
  showHelpTooltips: boolean;
  sourceBranding: Record<string, string>;
}

export interface Grant {
  id: string;
  name: string;
  enabledSheets: string[];
  sheetDefinitions: Record<string, any>;
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
}

export type QueueOperation = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
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

export interface ActivityLogEntry {
  id: string;
  assetId: string;
  assetDescription: string;
  operation: QueueOperation;
  timestamp: string;
  performedBy: string;
  userState: string;
  changes?: Record<string, { old: any; new: any }>;
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
}
