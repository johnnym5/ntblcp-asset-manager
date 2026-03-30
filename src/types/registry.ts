/**
 * @fileOverview Registry Data Models.
 * Defines the core interfaces for the header-aware asset management system.
 */

export type DataType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "select"
  | "boolean"
  | "computed";

export interface RegistryHeader {
  id: string;                 // stable internal key
  rawName: string;            // source header name from sheet
  displayName: string;        // editable label shown in UI
  normalizedName: string;     // normalized canonical key
  visible: boolean;           // show in registry list
  editable: boolean;          // can user rename it
  filterable: boolean;        // usable in filters
  sortEnabled: boolean;       // usable in sort
  dataType: DataType;
  orderIndex: number;         // display order
  locked?: boolean;           // essential headers cannot be removed
  group?: "Identity" | "Location" | "Classification" | "Procurement" | "Condition" | "Metadata" | "Hierarchy";
  schemaName?: string;        // schema variant this belongs to
}

export interface RegistryFieldValue {
  headerId: string;
  rawValue: string | number | boolean | null;
  displayValue: string;
}

export interface AssetRecord {
  id: string;
  rowNumber: number;
  sn?: string | number;
  sourceSheet?: string;
  sourceRow?: number;
  sourceBatch?: string;
  sectionName?: string;
  subsectionName?: string;
  assetFamily?: string;
  yearBucket?: number;
  transferSection?: string;
  headers: RegistryHeader[];
  fields: RegistryFieldValue[];
  rawRow: Record<string, unknown>;
  accentColor?: string; // HSL value for sheet-based color coding
}

export interface HeaderPreferenceState {
  selectedHeaderIds: string[];
  hiddenHeaderIds: string[];
  headerOrder: string[];
  renamedHeaders: Record<string, string>;
  activeSchemaName?: string;
  activeArrangement: "quick" | "full" | "checklist";
}

export interface HeaderFilter {
  headerId: string;
  operator:
    | "equals"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "in"
    | "range"
    | "dateRange"
    | "exists";
  value: string | number | boolean | Array<string | number> | null;
  min?: number;
  max?: number;
  startDate?: string;
  endDate?: string;
}

export type DensityMode = "compact" | "comfortable" | "expanded";

export interface RegistryFilterState {
  searchQuery: string;
  filters: HeaderFilter[];
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  selectedAssetIds: string[];
  visibleHeaderIds: string[];
  densityMode: DensityMode;
  viewMode?: "cards" | "rows";
}

export interface RenderFieldConfig {
  headerId: string;
  label: string;
  value: string;
  visible: boolean;
  isPrimary?: boolean;
  isSecondary?: boolean;
}

export interface RegistryPreset {
  id: string;
  name: string;
  description: string;
  visibleHeaderNames: string[];
  densityMode: DensityMode;
}
