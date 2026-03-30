/**
 * @fileOverview Core Domain Models for Assetain Rebuild.
 * Strictly typed, deterministic models for registry management.
 */

export type VerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'DISCREPANCY';

export interface SectionHierarchy {
  document: string;
  section: string;
  subsection: string;
  asset_family: string;
}

export interface ImportMetadata {
  source_file: string;
  sheet_name: string;
  row_number: number;
  imported_at: string; // ISO 8601
}

export interface Asset {
  id: string;
  name: string;
  description: string;
  category: string;
  
  // Hierarchical Context
  asset_family: string;
  section: string;
  subsection: string;
  
  // Location & Assignment
  location: string;
  custodian: string;
  
  // State & Assessment
  status: VerificationStatus;
  condition: string;
  
  // Financial & Temporal
  purchase_date: string; // ISO 8601
  value: number;
  serial_number: string;
  asset_id_code?: string;

  // Metadata & Traceability
  metadata: Record<string, string | number | boolean | null>;
  hierarchy: SectionHierarchy;
  import_metadata: ImportMetadata;
  
  // System Fields
  last_modified: string; // ISO 8601
  last_modified_by: string;
}

export interface AuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VERIFY' | 'IMPORT';
  user: string;
  timestamp: string; // ISO 8601
  entity_id: string;
  payload?: {
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
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
