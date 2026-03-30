/**
 * @fileOverview Unified Domain Models for Assetain.
 * Strictly typed, deterministic models for registry management and system configuration.
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER';
export type VerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'DISCREPANCY';

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

export interface Asset {
  id: string;
  name: string;
  description: string;
  category: string;
  
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

  // Metadata & Provenance
  hierarchy: SectionHierarchy;
  importMetadata: ImportMetadata;
  metadata: Record<string, unknown>;
  
  // System Fields
  lastModified: string; // ISO 8601
  lastModifiedBy: string;
}

export interface AppSettings {
  authorizedUsers: AuthorizedUser[];
  lockAssetList: boolean;
  appMode: 'management' | 'verification';
  activeDatabase: 'firestore' | 'rtdb';
  activeGrantId: string | null;
  grants: Grant[];
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
  isAdmin: boolean; // Shim for legacy compatibility
  isGuest?: boolean;
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
