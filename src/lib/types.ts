
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
  
  // Normalized fields
  sn?: string;
  location?: string;
  lga?: string;
  assignee?: string;
  description?: string;
  assetIdCode?: string;
  assetClass?: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  supplier?: string;
  dateReceived?: string | Timestamp;
  grnNo?: string;
  pvNo?: string;
  priceNaira?: string;
  priceUSD?: string;
  funder?: string;
  condition?: string;
  remarks?: string;
  grant?: string;
  usefulLifeYears?: string;
  verifiedStatus?: 'Verified' | 'Unverified';
  accumulatedDepreciation?: { ngn?: string; usd?: string };
  netBookValue?: { ngn?: string; usd?: string };
  imei?: string;
  comments?: string;

  // Motorcycle specific
  chasisNo?: string;
  engineNo?: string;
  
  // Financial data over years
  valuesByYear?: Record<string, { ngn?: string; usd?: string }>;

  // Keep a copy of the original row for reference
  originalData: Record<string, any>;

  // For offline/sync status
  syncStatus?: 'synced' | 'local';
}
