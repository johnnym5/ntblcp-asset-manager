/**
 * @fileOverview Unified Domain Models for Assetain.
 * Strictly typed, deterministic models for registry management and system configuration.
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER';
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
  | 'SETTINGS';

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
  assignee?: string;
  
  // State & Assessment
  status: VerificationStatus;
  condition: string;
  
  // Financial & Technical
  purchaseDate?: string;
  value: number; // NGN
  valueUsd?: number;
  serialNumber: string;
  assetIdCode?: string;
  manufacturer?: string;
  modelNumber?: string;
  chassisNo?: string;
  engineNo?: string;
  supplier?: string;
  usefulLife?: string;
  remarks?: string;
  grant?: string;
  pvJvNo?: string;
  imei?: string;

  // TB Depreciation Pulse
  depreciation?: {
    ngn: Record<string, number>;
    usd: Record<string, number>;
    accumulatedNgn?: number;
    netBookValueNgn?: number;
    accumulatedUsd?: number;
    netBookValueUsd?: number;
  };
  addedAssetsContext?: string;

  // Metadata & Traceability
  hierarchy: SectionHierarchy;
  importMetadata: ImportMetadata;
  metadata: Record<string, unknown>;
  rawRow?: any[];
  rawHeader?: string[];
  formulas?: Record<string, string>;
  
  // System Fields
  lastModified: string;
  lastModifiedBy: string;
  lastModifiedByState?: string;

  // Governance
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  pendingChanges?: Partial<Asset>;
  changeSubmittedBy?: {
    displayName: string;
    loginName: string;
    state: string;
  };

  previousState?: Partial<Asset>;
  yearBucket?: number;
}

export interface AppSettings {
  authorizedUsers: AuthorizedUser[];
  lockAssetList: boolean;
  appMode: 'management' | 'verification';
  activeDatabase: 'firestore' | 'rtdb';
  readAuthority: AuthorityNode;
  activeGrantId: string | null;
  grants: Grant[];
  sourceBranding?: Record<string, string>;
  uxMode: UXMode;
  onboardingComplete: boolean;
  showHelpTooltips: boolean;
  autoSync: boolean;
  autoAnalyze: boolean;
  autoSuggestFilters: boolean;
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
  isGuest?: boolean;
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
  metadata?: Record<string, any>;
}

export type ErrorSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type ErrorLogStatus = 'PENDING' | 'RESOLVED' | 'IGNORED' | 'ESCALATED';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  status: ErrorLogStatus;
  user: {
    id: string;
    name: string;
    role: string;
  };
  context: {
    page: string;
    module: string;
    action: string;
    browser: string;
    isOnline: boolean;
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
  adminNotes?: string;
}
