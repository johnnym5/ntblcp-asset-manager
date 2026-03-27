/**
 * @fileOverview Core types for the Assetain platform.
 */
import type { Timestamp } from 'firebase/firestore';

export interface Asset {
  id: string;
  category: string;
  grantId: string; // Mandatory for isolation
  
  // Core fields
  sn?: string;
  description?: string;
  serialNumber?: string;
  assetIdCode?: string;
  
  // Location & Assignment
  location?: string;
  lga?: string;
  site?: string;
  assignee?: string;

  // Details
  assetClass?: string;
  manufacturer?: string;
  modelNumber?: string;
  condition?: string;
  remarks?: string;
  
  // Vehicle Specific
  chasisNo?: string;
  engineNo?: string;
  
  // Purchase & Financial Info
  supplier?: string;
  dateReceived?: string | Timestamp;
  grnNo?: string;
  pvNo?: string;
  costNgn?: string;
  costUsd?: string;
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
  lastModified?: string;
  lastModifiedBy?: string;
  lastModifiedByState?: string;

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

export interface AuthorizedUser {
  loginName: string;
  displayName: string;
  password?: string;
  states: string[];
  isAdmin: boolean;
  isZonalAdmin?: boolean;
  assignedZone?: string;
  isGuest?: boolean;
  canAddAssets?: boolean;
  canEditAssets?: boolean;
}

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
  disabledFor?: string[];
  isHidden?: boolean;
}

export interface Grant {
    id: string;
    name: string;
    sheetDefinitions: Record<string, SheetDefinition>;
}

export interface HistoricalAppSettings extends Omit<AppSettings, 'settingsHistory' | 'grants'> {
    grants: Omit<Grant, 'sheetDefinitions'>[];
}

export interface AppSettings {
  grants: Grant[];
  activeGrantId: string | null;
  authorizedUsers: AuthorizedUser[];
  lockAssetList: boolean;
  appMode: 'management' | 'verification';
  locations?: string[];
  lastModified?: string;
  lastModifiedBy?: {
    displayName: string;
    loginName: string;
  };
  settingsHistory?: HistoricalAppSettings[];
}
