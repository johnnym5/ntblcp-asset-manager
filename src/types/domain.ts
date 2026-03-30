/**
 * @fileOverview Core Domain Models for Assetain Rebuild.
 * Strictly typed, deterministic models for registry management.
 */

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
  importedAt: string;
}

export interface Asset {
  id: string;
  name: string;
  description: string;
  category: string;
  location: string;
  custodian: string;
  status: VerificationStatus;
  condition: string;
  purchaseDate: string; // ISO 8601
  value: number;
  serialNumber: string;
  assetIdCode?: string;
  hierarchy: SectionHierarchy;
  importMetadata: ImportMetadata;
  metadata: Record<string, string | number | boolean | null>;
  lastModified: string;
  lastModifiedBy: string;
}

export interface AuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VERIFY' | 'IMPORT';
  user: string;
  timestamp: string;
  entityId: string;
  payload?: {
    before: Record<string, any> | null;
    after: Record<string, any> | null;
  };
}

export type QueueOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type QueueStatus = 'PENDING' | 'PROCESSING' | 'FAILED';

export interface OfflineQueueEntry {
  id: string;
  operation: QueueOperation;
  collection: string;
  payload: any;
  status: QueueStatus;
  timestamp: number;
  error?: string;
}
