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

export interface HeaderTemplate {
  id: string;
  rawHeaders: string[];
  normalizedHeaders: string[];
  columnCount: number;
  signature: string; // Serialized header set for matching
}

export interface DiscoveredGroup {
  id: string;
  groupName: string;
  headerSet: string[];
  headerSource: 'explicit' | 'inferred';
  columnCount: number;
  rowCount: number; // Added: Amount of assets in this group
  templateId: string;
  startRow: number;
  endRow?: number;
  matchedTemplateSource?: string;
  sheetName: string;
  workbookName: string;
}

export interface ValidationLog {
  rowNumber: number;
  type: 'header_mismatch' | 'missing_columns' | 'extra_columns' | 'empty_row' | 'unassigned_group' | 'column_count_mismatch';
  message: string;
  rawData: any[];
}

export interface ValidationSummary {
  warnings: string[];
  errors: string[];
  duplicateFlags: string[];
  needsReview: boolean;
  isRejected: boolean;
  logs: ValidationLog[];
}

export interface ParsedAsset extends Asset {
  validation: ValidationSummary;
  sourceGroup: string;
  templateId: string;
}

export interface GroupImportContainer {
  id: string;
  groupName: string;
  templateId: string;
  workbookName: string;
  sheetName: string;
  headerSet: string[];
  assets: ParsedAsset[];
  metrics: {
    total: number;
    valid: number;
    invalid: number;
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
