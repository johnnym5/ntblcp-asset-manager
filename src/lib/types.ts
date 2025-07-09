
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role: 'admin' | 'user';
  state?: string; // e.g., 'Lagos'
}

export interface Asset {
  id: string;
  category: string; // The name of the sheet it came from
  
  // Normalized fields from various sheets
  sn?: string;
  description?: string;
  serialNumber?: string;
  location?: string;
  lga?: string;
  assignee?: string;
  condition?: string;
  
  assetIdCode?: string;
  assetClass?: string;
  manufacturer?: string;
  modelNumber?: string;
  supplier?: string;
  dateReceived?: string | Timestamp;
  grnNo?: string;
  pvNo?: string;
  costNgn?: string;
  costUsd?: string;
  funder?: string;
  remarks?: string;
  grant?: string;
  usefulLifeYears?: string;
  imei?: string;
  comments?: string;

  // Vehicle/Motorcycle specific
  chasisNo?: string;
  engineNo?: string;

  // IHVN specific
  tagNumbers?: string;
  classification?: string;
  qty?: string;
  site?: string;
  state?: string;
  
  // Status fields
  verifiedStatus?: 'Verified' | 'Unverified' | 'Discrepancy';
  verifiedDate?: string;
  syncStatus?: 'synced' | 'local';
  lastModified?: string; // ISO 8601 date string
  lastModifiedBy?: string; // displayName of user who last modified
  lastModifiedByState?: string; // state of user who last modified

  // Financial data (optional) - Not currently used in logic but reserved
  priceNaira?: string; // alias for costNgn
  priceUSD?: string; // alias for costUsd
  accumulatedDepreciation?: { ngn?: string; usd?: string };
  netBookValue?: { ngn?: string; usd?: string };
  valuesByYear?: Record<string, { ngn?: string; usd?: string }>;
}
