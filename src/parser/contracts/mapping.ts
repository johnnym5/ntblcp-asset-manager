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
  // Identification
  'S/N': 'serialNumber',
  'SERIAL NUMBER': 'serialNumber',
  'ASSET SERIAL NUMBERS': 'serialNumber',
  'DESCRIPTION': 'description',
  'ASSET DESCRIPTION': 'description',
  'TAG NUMBER': 'assetIdCode',
  'ASSET ID CODE': 'assetIdCode',
  
  // Regional
  'LOCATION': 'location',
  'STATE': 'location',
  'LGA': 'location',
  'ASSIGNEE': 'custodian',
  'LOCATION/USER': 'custodian',
  
  // Technical
  'CONDITION': 'condition',
  'REMARKS': 'description', // Fallback for secondary description
};

/**
 * Calculates how well a row matches the known registry contracts.
 */
export function calculateHeaderIntegrity(row: string[]): number {
  const normalizedRow = row.map(h => String(h || '').trim().toUpperCase());
  const contractHeaders = Object.keys(REGISTRY_MAPPING_CONTRACT);
  
  const matches = normalizedRow.filter(h => contractHeaders.includes(h));
  return matches.length / contractHeaders.length;
}
