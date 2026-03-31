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

/**
 * SPA Workstation View Enumeration.
 * Defines the logical sections available in the unified app shell.
 */
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
  importedAt: string; // ISO 8601
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
  grantId: string; // Link to the specific project/grant
  
  // Hierarchical Context
  section: string;
  subsection: string;
  assetFamily: string;
  
  // Location & Assignment
  location: string;
  custodian: string;
  
  // State & Assessment
  status: VerificationStatus;
  condition: string;
  
  // Financial & Technical
  purchaseDate?: string;
  value: number;
  serialNumber: string;
  assetIdCode?: string;
  
  // Media Persistence
  photoDataUri?: string; // Local visual evidence pulse (base64)
  photoUrl?: string;     // Remote storage pulse (Firebase Storage URL)
  
  // Forensic Verification Pulse
  signatureDataUri?: string; // Local signature pulse (base64)
  signatureUrl?: string;     // Remote storage pulse (Firebase Storage URL)
  
  geotag?: Geotag; // Spatial field protocol

  // Metadata & Provenance
  hierarchy: SectionHierarchy;
  importMetadata: ImportMetadata;
  metadata: Record<string, unknown>;
  
  // System Fields
  lastModified: string; // ISO 8601
  lastModifiedBy: string;
  lastModifiedByState?: string;

  // Governance & Approval Workflow
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  pendingChanges?: Partial<Asset>;
  adminComment?: string;
  changeSubmittedBy?: {
    displayName: string;
    loginName: string;
    state: string;
  };

  // Restoration Buffer
  previousState?: Partial<Asset>;
  yearBucket?: number;
}

export interface AppSettings {
  authorizedUsers: AuthorizedUser[];
  lockAssetList: boolean;
  appMode: 'management' | 'verification';
  activeDatabase: 'firestore' | 'rtdb';
  readAuthority: AuthorityNode; // PRD: Failover authority
  activeGrantId: string | null;
  grants: Grant[];
  sourceBranding?: Record<string, string>; // Maps sheetName to HSL/Hex color
  
  // UX Preferences
  uxMode: UXMode;
  onboardingComplete: boolean;
  showHelpTooltips: boolean;
  
  // Automation Preferences
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
  isSuperAdmin?: boolean; // Unlocks virtual database management
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
