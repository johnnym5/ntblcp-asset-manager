/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Identifies the functional role of a row based on Column A behavior and row density.
 * Phase 326: Hardened detection for section labels in formatted Excel files.
 */

import { RowClassification } from './types';

const SCHEMA_ANCHORS = [
  'S/N', 'SN', 'S.N', 'SERIAL NO', 'SERIAL NUMBER', 
  'STATE', 'LOCATION', 'DATE', 'ASSET', 'TAG', 'MODEL', 'MAKE', 'REG', 'NAME',
  'DESCRIPTION', 'CLASSIFICATION', 'CATEGORY', 'MANUFACTURER'
];

export function classifyRow(row: any[]): RowClassification {
  if (!row || row.length === 0 || row.every(cell => cell === null || String(cell).trim() === '')) {
    return 'EMPTY';
  }

  // Find the first non-empty cell and its index
  const firstPopulatedIdx = row.findIndex(c => c !== null && String(c).trim() !== '');
  const firstPopulatedValue = String(row[firstPopulatedIdx] || '').trim();
  const firstValueUpper = firstPopulatedValue.toUpperCase();
  
  const populatedCount = row.filter(c => c !== null && String(c).trim() !== '').length;

  // 1. SCHEMA_HEADER: Identifies the start of a data block
  const schemaMatchCount = row.filter(cell => {
    if (typeof cell !== 'string') return false;
    const c = cell.toUpperCase().trim();
    return SCHEMA_ANCHORS.some(anchor => c === anchor || c.startsWith(anchor + ' '));
  }).length;

  if (schemaMatchCount >= 2) {
    return 'SCHEMA_HEADER';
  }

  // 2. DATA_ROW: If the first populated cell is numeric
  const isNumeric = firstPopulatedValue !== '' && !isNaN(Number(firstPopulatedValue.replace(/[^0-9.]/g, '')));
  if (isNumeric && firstPopulatedIdx < 2) {
    return 'DATA_ROW';
  }

  // 3. GROUP_HEADER: Structural section boundary
  // Often in formatted Excel, labels might be in Column A or Column B with very few other cells populated.
  if (populatedCount >= 1 && populatedCount <= 3 && firstPopulatedIdx <= 2) {
    const isTechnicalNoise = 
      firstValueUpper.startsWith('TOTAL') || 
      firstValueUpper.includes('PAGE ') || 
      firstValueUpper.startsWith('GRAND') ||
      firstValueUpper === 'S/N' || 
      firstValueUpper === 'SN' ||
      firstValueUpper === 'DATE' ||
      firstValueUpper.includes('SIGNATURE') ||
      firstValueUpper.length < 2;
    
    if (!isTechnicalNoise) return 'GROUP_HEADER';
  }

  // 4. DATA_ROW FALLBACK: Higher density rows are usually assets
  if (populatedCount >= 4) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}
