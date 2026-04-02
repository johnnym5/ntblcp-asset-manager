/**
 * @fileOverview Deterministic Parser Mapping Contracts.
 * Defines explicit rules for converting Excel headers to domain fields.
 * Phase 400: Updated for high-fidelity TB and C19 template support.
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
  'ASSETS TAG NO': 'assetIdCode',
  
  // Regional
  'LOCATION': 'location',
  'STATE': 'location',
  'LGA': 'lga',
  'ASSIGNEE': 'custodian',
  'ASSIGNEE (LOCATION)': 'custodian',
  'LOCATION/USER': 'custodian',
  'CUSTODIAN': 'custodian',
  'SITE': 'site',
  
  // Classification
  'MANUFACTURER': 'manufacturer',
  'MODEL NUMBER': 'modelNumber',
  'MODEL NUMBERS': 'modelNumber',
  'MODEL NO': 'modelNumber',
  'CATEGORY': 'category',
  'ASSET CLASS': 'category',
  'CLASSIFICATION': 'category',

  // Technical
  'CONDITION': 'condition',
  'REMARKS': 'remarks',
  'DATE PURCHASED OR RECEIVED': 'purchaseDate',
  'ACQUISITION DATE': 'purchaseDate',
  'YEAR OF PURCHASE': 'purchaseDate',
  'COST (NGN)': 'value',
  'COST(N)': 'value',
  'PURCHASE PRICE': 'value',
  'PURCHASE PRICE (NAIRA)': 'value',
  'CHASIS NO': 'chassisNo',
  'ENGINE NO': 'engineNo',
  'QTY': 'value', // Some registers use QTY as a count
};

export function calculateHeaderIntegrity(row: string[]): number {
  const normalizedRow = row.map(h => String(h || '').trim().toUpperCase());
  const contractHeaders = Object.keys(REGISTRY_MAPPING_CONTRACT);
  
  const matches = normalizedRow.filter(h => contractHeaders.includes(h));
  if (contractHeaders.length === 0) return 0;
  return matches.length / normalizedRow.length;
}
