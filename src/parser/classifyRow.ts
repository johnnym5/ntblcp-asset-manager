/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Identifies the functional role of a row based on Column A behavior and row density.
 * Phase 320: Hardened group detection to prevent "General Register" fallbacks.
 */

import { RowClassification } from './types';

const SCHEMA_ANCHORS = [
  'S/N', 'SN', 'S.N', 'SERIAL NO', 'SERIAL NUMBER', 
  'STATE', 'LOCATION', 'DATE', 'ASSET', 'TAG', 'MODEL', 'MAKE', 'REG', 'NAME'
];

export function classifyRow(row: any[]): RowClassification {
  if (!row || row.length === 0 || row.every(cell => cell === null || String(cell).trim() === '')) {
    return 'EMPTY';
  }

  const colA = String(row[0] || '').trim();
  const colA_Upper = colA.toUpperCase();
  
  // 1. SCHEMA_HEADER: Explicitly identifies the start of a data block
  if (SCHEMA_ANCHORS.some(anchor => colA_Upper === anchor || colA_Upper.startsWith(anchor + ' '))) {
    return 'SCHEMA_HEADER';
  }

  // 2. DATA_ROW: If Col A is numeric, it is almost certainly a sequence pulse
  const isNumericColA = colA !== '' && !isNaN(Number(colA.replace(/[^0-9.]/g, '')));
  if (isNumericColA) {
    return 'DATA_ROW';
  }

  const populatedCount = row.filter(c => c !== null && String(c).trim() !== '').length;

  // 3. GROUP_HEADER: Structural section boundary in Column A
  // If Column A has text and the rest of the row is nearly empty, it's a Group Label
  if (colA && populatedCount <= 2 && colA.length > 3) {
    // Ignore technical noise like "Total" or page numbers
    if (colA_Upper.startsWith('TOTAL') || colA_Upper.includes('PAGE ')) return 'EMPTY';
    return 'GROUP_HEADER';
  }

  // 4. DATA_ROW FALLBACK: If there is significant data density, treat as data
  if (populatedCount >= 3) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}
