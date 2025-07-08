
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
  priceNaira?: string;
  priceUSD?: string;
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
  yearOfPurchase?: string;
  costNgn?: string;
  state?: string;
  
  // Status fields
  verifiedStatus?: 'Verified' | 'Unverified' | 'Discrepancy';
  verifiedDate?: string;
  syncStatus?: 'synced' | 'local';
  lastModified?: string; // ISO 8601 date string

  // Financial data (optional)
  accumulatedDepreciation?: { ngn?: string; usd?: string };
  netBookValue?: { ngn?: string; usd?: string };
  valuesByYear?: Record<string, { ngn?: string; usd?: string }>;
}
