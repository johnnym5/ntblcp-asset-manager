/**
 * @fileOverview Centralized Domain Models for Assetain.
 * Defines the core entities used throughout the Clean Architecture.
 */

export type VerificationStatus = 'Verified' | 'Unverified' | 'Discrepancy';
export type SyncStatus = 'synced' | 'local' | 'syncing' | 'conflict';
export type UserRole = 'SUPER_ADMIN' | 'ZONAL_MANAGER' | 'FIELD_OFFICER' | 'GUEST';

export interface UserIdentity {
  loginName: string;
  displayName: string;
  email: string;
  role: UserRole;
  states: string[]; // Regional scopes
  assignedZone?: string;
}

export interface Asset {
  id: string;
  category: string;
  grantId: string;
  
  // Core Identification
  sn?: string;
  description: string;
  serialNumber?: string;
  assetIdCode?: string;
  
  // Regional Context
  location: string;
  lga?: string;
  site?: string;
  assignee?: string;

  // Technical Metadata
  manufacturer?: string;
  modelNumber?: string;
  condition: string;
  remarks?: string;
  
  // Hierarchy (From Parser)
  majorSection?: string;
  subsectionName?: string;
  yearBucket?: number;
  
  // Traceability
  verifiedStatus: VerificationStatus;
  verifiedDate?: string;
  lastModified: string;
  lastModifiedBy: string;
  
  // System Metadata (Not persisted to Cloud)
  syncStatus?: SyncStatus;
  previousState?: Partial<Asset>; 
}

export interface ProjectGrant {
  id: string;
  name: string;
  active: boolean;
  config: {
    lockRegistry: boolean;
    requireVisualProof: boolean;
    enabledCategories: string[];
  };
}

export interface SystemSettings {
  activeGrantId: string | null;
  activeDatabase: 'firestore' | 'rtdb';
  appMode: 'management' | 'verification';
}
