/**
 * @fileOverview Deterministic Parser Mapping Contracts.
 * Defines explicit rules for converting Excel headers to domain fields.
 */

import { Asset } from '@/types/domain';

export type HeaderMap = Record<string, keyof Asset>;

/**
 * STRICT MAPPING CONTRACT
 * The system will ONLY look for these headers. 
 * Probabilistic keyword matching is forbidden.
 */
export const REGISTRY_MAPPING_CONTRACT: HeaderMap = {
  // Common Headers
  'S/N': 'sn',
  'DESCRIPTION': 'description',
  'ASSET DESCRIPTION': 'description',
  'SERIAL NUMBER': 'serialNumber',
  'ASSET SERIAL NUMBERS': 'serialNumber',
  'TAG NUMBER': 'assetIdCode',
  'ASSET ID CODE': 'assetIdCode',
  'TAG NUMBERS': 'assetIdCode',
  
  // Location Mapping
  'LOCATION': 'location',
  'STATE': 'location',
  'LGA': 'lga',
  'SITE': 'site',
  'ASSIGNEE': 'assignee',
  'LOCATION/USER': 'assignee',
  
  // Technical Mapping
  'MANUFACTURER': 'manufacturer',
  'MODEL NUMBER': 'modelNumber',
  'MODEL NUMBERS': 'modelNumber',
  'CONDITION': 'condition',
  'REMARKS': 'remarks',
  'COMMENTS': 'remarks'
};

/**
 * Determines if a row qualifies as a data row based on header intersections.
 */
export function calculateHeaderIntegrity(row: string[]): number {
  const normalizedRow = row.map(h => h.trim().toUpperCase());
  const contractHeaders = Object.keys(REGISTRY_MAPPING_CONTRACT);
  
  const matches = normalizedRow.filter(h => contractHeaders.includes(h));
  return matches.length / contractHeaders.length;
}
