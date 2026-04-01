/**
 * @fileOverview Deterministic Parser Mapping Contracts.
 * Defines explicit rules for converting Excel headers to domain fields.
 * Phase 205: Expanded aliases for high-volume registers.
 */

import type { Asset } from '@/types/domain';

export type HeaderMap = Record<string, keyof Asset>;

/**
 * STRICT MAPPING CONTRACT
 */
export const REGISTRY_MAPPING_CONTRACT: HeaderMap = {
  // Identification
  'S/N': 'sn',
  'SN': 'sn',
  'S.N': 'sn',
  'SERIAL NUMBER': 'serialNumber',
  'ASSET SERIAL NUMBERS': 'serialNumber',
  'DESCRIPTION': 'description',
  'ASSET DESCRIPTION': 'description',
  'ASSET NAME': 'description',
  'TAG NUMBER': 'assetIdCode',
  'TAG NUMBERS': 'assetIdCode',
  'ASSET ID CODE': 'assetIdCode',
  
  // Regional
  'LOCATION': 'location',
  'STATE': 'location',
  'LGA': 'location',
  'ASSIGNEE': 'custodian',
  'LOCATION/USER': 'custodian',
  'CUSTODIAN': 'custodian',
  
  // Classification
  'MANUFACTURER': 'manufacturer',
  'MODEL NUMBER': 'modelNumber',
  'MODEL NO': 'modelNumber',
  'CATEGORY': 'category',
  'ASSET CLASS': 'category',
  'CLASSIFICATION': 'category',

  // Technical
  'CONDITION': 'condition',
  'REMARKS': 'remarks',
  'DATE PURCHASED OR RECEIVED': 'purchaseDate',
  'YEAR OF PURCHASE': 'purchaseDate',
  'YEAR': 'purchaseDate',
  'COST (NGN)': 'value',
  'PURCHASE PRICE (NAIRA)': 'value',
};

export function calculateHeaderIntegrity(row: string[]): number {
  const normalizedRow = row.map(h => String(h || '').trim().toUpperCase());
  const contractHeaders = Object.keys(REGISTRY_MAPPING_CONTRACT);
  
  const matches = normalizedRow.filter(h => contractHeaders.includes(h));
  if (contractHeaders.length === 0) return 0;
  return matches.length / normalizedRow.length;
}
