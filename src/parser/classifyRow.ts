/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Identifies the functional role of a row based on Column A behavior and row density.
 * Phase 325: Hardened logic to distinguish group labels from technical noise.
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

  const colA = String(row[0] || '').trim();
  const colA_Upper = colA.toUpperCase();
  
  // 1. SCHEMA_HEADER: Identifies the start of a data block
  // A row is a schema header if it contains multiple anchor keywords.
  const schemaMatchCount = row.filter(cell => {
    if (typeof cell !== 'string') return false;
    const c = cell.toUpperCase().trim();
    return SCHEMA_ANCHORS.some(anchor => c === anchor || c.startsWith(anchor + ' '));
  }).length;

  if (schemaMatchCount >= 3 || (schemaMatchCount >= 2 && colA_Upper.includes('S/N'))) {
    return 'SCHEMA_HEADER';
  }

  // 2. DATA_ROW: If Col A is numeric, it is almost certainly a sequence pulse
  const isNumericColA = colA !== '' && !isNaN(Number(colA.replace(/[^0-9.]/g, '')));
  if (isNumericColA) {
    return 'DATA_ROW';
  }

  const populatedCount = row.filter(c => c !== null && String(c).trim() !== '').length;

  // 3. GROUP_HEADER: Structural section boundary
  // If Column A has text and the rest of the row is nearly empty, it's a Group Label.
  // We also check length to avoid single-character artifacts.
  if (colA && populatedCount <= 3 && colA.length > 2) {
    const isTechnicalNoise = 
      colA_Upper.startsWith('TOTAL') || 
      colA_Upper.includes('PAGE ') || 
      colA_Upper.startsWith('GRAND') ||
      colA_Upper === 'S/N' || 
      colA_Upper === 'SN' ||
      colA_Upper === 'DATE' ||
      colA_Upper.includes('SIGNATURE');
    
    if (!isTechnicalNoise) return 'GROUP_HEADER';
  }

  // 4. DATA_ROW FALLBACK: Higher density rows are usually assets
  if (populatedCount >= 4) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}
