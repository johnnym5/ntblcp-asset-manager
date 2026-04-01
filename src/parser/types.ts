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
  signature: string; // Hash of header positions
}

export interface DiscoveredGroup {
  groupName: string;
  headerSet: string[];
  headerSource: 'explicit' | 'inferred';
  columnCount: number;
  templateId: string;
  startRow: number;
}

export interface ValidationSummary {
  warnings: string[];
  errors: string[];
  duplicateFlags: string[];
  needsReview: boolean;
  isRejected: boolean;
}

export interface ParsedAsset extends Asset {
  validation: ValidationSummary;
  sourceGroup: string;
  templateId: string;
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
}

export interface ParserState {
  activeGroup: string;
  activeTemplateId: string;
  activeHeaders: string[];
  workbookName: string;
  sheetName: string;
}
