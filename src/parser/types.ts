/**
 * @fileOverview Parser System Types.
 */

import type { Asset, SectionHierarchy } from '@/types/domain';

export type RowClassification = 
  | 'EMPTY' 
  | 'DOC_TITLE' 
  | 'SECTION_TITLE' 
  | 'SCHEMA_HEADER' 
  | 'DATA_ROW' 
  | 'UNKNOWN';

export interface WorkbookProfile {
  id: 'TB_PROFILE' | 'C19_PROFILE';
  workbookMatchHints: string[];
  sheetNameHints: string[];
  titlePatterns: string[];
  sectionPatterns: string[];
  primaryHeaderSignature: string[];
  secondaryHeaderSignatures: string[][];
  headerAliases: Record<string, string>;
  grantKey: string;
}

export interface ParserState {
  profile: WorkbookProfile | null;
  sheetName: string;
  docTitle: string;
  sectionPath: {
    documentTitle: string;
    majorSection: string;
    subsection: string;
    assetFamily: string;
  };
  activeHeader: string[] | null;
  activeHeaderMap: Record<string, number> | null;
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
}

export interface ImportRunSummary {
  workbookName: string;
  sheetName: string;
  profileId: string;
  totalRows: number;
  titleRows: number;
  sectionRows: number;
  headerRows: number;
  dataRowsImported: number;
  rowsRejected: number;
  rowsRequiringReview: number;
  duplicatesDetected: number;
  warningsCount: number;
  errorsCount: number;
  sectionBreakdown: Record<string, number>;
}
