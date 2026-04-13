/**
 * @fileOverview Structural Parser System Types.
 * Defines the models for group-aware, template-driven registry ingestion.
 */

import type { Asset } from '@/types/domain';

export type RowClassification = 
  | 'EMPTY' 
  | 'GROUP_HEADER' 
  | 'SCHEMA_HEADER' 
  | 'DATA_ROW' 
  | 'UNKNOWN';

export type HeaderSource = 'explicit' | 'inferred' | 'synthetic';
export type HeaderSetType = 'real_template' | 'inferred_template' | 'generated_template';

export interface HeaderTemplate {
  id: string;
  rawHeaders: string[];
  normalizedHeaders: string[];
  columnCount: number;
  signature: string; // Serialized header set for matching
  type: HeaderSetType;
}

export interface DiscoveredGroup {
  id: string;
  groupName: string;
  headerSet: string[];
  headerSource: HeaderSource;
  headerSetType: HeaderSetType;
  columnCount: number;
  rowCount: number;
  startRow: number;
  endRow: number;
  headerStart: number | null;
  headerEnd: number | null;
  rawText: string;
  visibleHeaderRow: string[] | null;
  templateId: string;
  sheetName: string;
  workbookName: string;
  notes?: string;
}

export interface ValidationLog {
  rowNumber: number;
  type: 'header_mismatch' | 'missing_columns' | 'extra_columns' | 'empty_row' | 'unassigned_group' | 'duplicate_identity';
  message: string;
  rawData: any[];
}

export interface ValidationSummary {
  warnings: string[];
  errors: string[];
  duplicateFlags: string[];
  needsReview: boolean;
  isRejected: boolean;
  isUpdate: boolean; // Flag indicating the record already exists in the DB
  existingAssetId?: string; // Reference to the existing record
  logs: ValidationLog[];
}

export interface ParsedAsset extends Asset {
  validation: ValidationSummary;
  sourceGroup: string;
  templateId: string;
  sourceColumnAGroup?: string;
  headerSource: HeaderSource;
  headerSetType: HeaderSetType;
}

export interface GroupImportContainer extends DiscoveredGroup {
  assets: ParsedAsset[];
  metrics: {
    valid: number;
    invalid: number;
    updates: number;
    new: number;
  };
}

export interface ImportRunSummary {
  workbookName: string;
  sheetName: string;
  profileId: string;
  totalRows: number;
  groupCount: number;
  dataRowsImported: number;
  rowsRejected: number;
  duplicatesDetected: number;
  templatesDiscovered: number;
  sectionBreakdown: Record<string, number>;
  groups: GroupImportContainer[];
}
