/**
 * @fileOverview Unified Domain Models for Assetain.
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'VERIFIER' | 'VIEWER' | 'SUPERADMIN';
export type VerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'DISCREPANCY';
export type ConditionGroup = 'Good' | 'Bad' | 'Stolen' | 'Obsolete' | 'Unsalvageable' | 'Discrepancy';
export type DataSource = 'PRODUCTION' | 'SANDBOX';
export type UXMode = 'beginner' | 'advanced';
export type StorageLayer = 'FIRESTORE' | 'RTDB' | 'LOCAL';
export type AuthorityNode = 'FIRESTORE' | 'RTDB';

export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
export type LocationMatchStatus = 'MATCHED' | 'PARTIAL' | 'UNASSIGNED' | 'NEEDS_REVIEW' | 'INVALID';

export type ValidationGroup = 'electronics' | 'vehicles' | 'furniture' | 'medical' | 'infrastructure' | 'unknown';

export type WorkstationView = 
  | 'DASHBOARD' 
  | 'REGISTRY' 
  | 'GROUPS'
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
  | 'GIS'
  | 'ANOMALIES';

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
  
  // Hierarchical Context
  section: string;
  subsection: string;
  assetFamily: string;
  
  // Location & Assignment
  location: string; // Raw input
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
  condition: string; // Human display label
  conditionGroup: ConditionGroup; // Canonical grouping
  conditionNotes?: string;
  conditionHistory?: ConditionAuditEntry[];
  discrepancyFlag?: boolean;
  reviewStatus?: 'PENDING' | 'RESOLVED' | 'FLAGGED';
  
  // Discrepancy Engine Data
  discrepancies: AssetDiscrepancy[];
  overallFidelityScore: number; // 0-100

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

  // Smart Classification (Post-Import)
  classification?: AssetClassification;

  // Metadata & Traceability
  hierarchy: SectionHierarchy;
  importMetadata: ImportMetadata;
  metadata: Record<string, unknown>;
  
  // System Fields
  lastModified: string;
  lastModifiedBy: string;
  lastModifiedByState?: string;

  // Notification & Drill-down layer
  updateCount: number;
  unseenUpdateFields: string[];
  
  // Restoration Buffer
  previousState?: Partial<Asset> | null;
  
  // Structural Parsing Provenance
  sourceGroup?: string;
  sourceColumnAGroup?: string;
  templateId?: string;

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
  isZonalAdmin?: boolean;
  assignedZone?: string;
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
