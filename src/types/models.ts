import type { Timestamp } from 'firebase/firestore';

/**
 * Core Asset entity representing a verified item.
 */
export interface Asset {
  id: string;
  category: string;
  grantId?: string; // Project ID
  
  // Core fields
  sn?: string;
  description?: string;
  serialNumber?: string;
  assetIdCode?: string; // From "Asset ID Code" or "TAG NUMBERS"
  
  // Location & Assignment
  location?: string; // From "Location" or "STATE"
  lga?: string;
  site?: string; // From "SITE" (IHVN specific)
  assignee?: string;

  // Details
  assetClass?: string; // From "Asset Class" or "CLASSIFICATION"
  manufacturer?: string;
  modelNumber?: string; // From "Model Number" or "MODEL NUMBERS"
  condition?: string;
  remarks?: string; // From "Remarks" or "Comments"
  
  // Vehicle Specific
  chasisNo?: string;
  engineNo?: string;
  
  // Purchase & Financial Info
  supplier?: string; // From "Supplier" or "Suppliers"
  dateReceived?: string | Timestamp; // From "Date Purchased or Received" or "YEAR OF PURCHASE"
  grnNo?: string; // From "Chq No / Goods Received Note No."
  pvNo?: string; // From "PV No"
  costNgn?: string; // From "Purchase price (Naira)" or "COST (NGN)"
  costUsd?: string; // From "Purchase Price [USD)"
  funder?: string;
  grant?: string;
  usefulLifeYears?: string;

  // Other specific fields
  qty?: string;
  imei?: string;

  // Status fields
  verifiedStatus?: 'Verified' | 'Unverified' | 'Discrepancy';
  verifiedDate?: string;
  syncStatus?: 'synced' | 'local' | 'syncing';
  lastModified?: string; // ISO 8601 date string
  lastModifiedBy?: string; // displayName of user who last modified
  lastModifiedByState?: string; // state of user who last modified

  // Client-side undo buffer
  previousState?: Partial<Asset>;

  // Approval Workflow Fields
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  pendingChanges?: Partial<Asset>;
  adminComment?: string;
  changeSubmittedBy?: { 
    displayName: string;
    loginName: string;
    state: string;
  };

  // Custom fields
  customField1?: string;
  customField2?: string;
  customField3?: string;
  customField4?: string;
  customField5?: string;
}

/**
 * User profile with role-based access control.
 */
export interface AuthorizedUser {
  loginName: string;
  displayName: string;
  password?: string;
  states: string[];
  isAdmin: boolean;
  isGuest?: boolean;
  canAddAssets?: boolean;
  canEditAssets?: boolean;
  canVerifyAssets?: boolean;
}

/**
 * Represents a raw data row from an Excel import.
 */
export type ImportRow = Record<string, string | number | null | undefined>;

export interface DisplayField {
  key: keyof Asset;
  label: string;
  table: boolean;
  quickView: boolean;
  inChecklist?: boolean;
  checklistSection?: 'required' | 'important';
}

export interface SheetDefinition {
  name: string;
  headers: string[];
  displayFields: DisplayField[];
  disabledFor?: string[]; // 'all' or list of loginNames
  isHidden?: boolean;
  subSheetTriggers?: string[]; 
}

export interface Grant {
    id: string;
    name: string;
    sheetDefinitions: Record<string, SheetDefinition>;
}

// A version of AppSettings that doesn't have a history property, to prevent infinite recursion.
export interface HistoricalAppSettings extends Omit<AppSettings, 'settingsHistory' | 'grants'> {
    grants: Omit<Grant, 'sheetDefinitions'>[]; // Don't store the massive sheet defs in history
}

export interface AppSettings {
  grants: Grant[];
  activeGrantId: string | null;

  authorizedUsers: AuthorizedUser[];
  lockAssetList: boolean;
  appMode: 'management' | 'verification';
  locations?: string[];
  defaultDataSource?: 'cloud' | 'local_locked';
  defaultDatabase?: 'firestore' | 'rtdb';
  lastModified?: string;
  lastModifiedBy?: {
    displayName: string;
    loginName: string;
  };
  settingsHistory?: HistoricalAppSettings[];
}
