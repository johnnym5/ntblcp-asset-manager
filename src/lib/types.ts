/**
 * @fileOverview Internal Library Types.
 * Synchronized with domain.ts to resolve compilation conflicts in legacy components.
 */

import type { Timestamp } from 'firebase/firestore';
import type { VerificationStatus, ConditionGroup, SyncStatus } from '@/types/domain';

export interface Asset {
  id: string;
  category: string;
  grantId: string;
  
  // Core fields
  sn: string;
  description: string;
  serialNumber: string;
  assetIdCode: string;
  
  // Location & Assignment
  location: string;
  lga: string;
  site: string;
  custodian: string;

  // Details
  manufacturer: string;
  modelNumber: string;
  condition: string;
  remarks: string;
  
  // Vehicle Specific
  chassisNo: string;
  engineNo: string;
  
  // Purchase & Financial Info
  supplier: string;
  purchaseDate?: string;
  grnNo: string;
  pvNo: string;
  value: number;
  purchasePriceUsd: number;
  funder: string;
  usefulLifeYears: string;

  // Status fields
  status: VerificationStatus;
  syncStatus?: SyncStatus;
  lastModified: string;
  lastModifiedBy: string;
  lastModifiedByState?: string;

  // Approval Workflow Fields
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  pendingChanges?: any;
  changeSubmittedBy?: { 
    displayName: string;
    loginName: string;
    state: string;
  };
}

export interface AuthorizedUser {
  loginName: string;
  displayName: string;
  email: string;
  password?: string;
  states: string[];
  role: string;
  isAdmin: boolean;
}

export interface DisplayField {
  key: keyof Asset;
  label: string;
  table: boolean;
  quickView: boolean;
  inChecklist?: boolean;
}

export interface SheetDefinition {
  name: string;
  headers: string[];
  displayFields: DisplayField[];
}
