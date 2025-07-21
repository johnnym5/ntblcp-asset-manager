
import type { Timestamp } from 'firebase/firestore';

export interface Asset {
  id: string;
  category: string;
  
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
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'user' | 'guest';
  state: string;
}
