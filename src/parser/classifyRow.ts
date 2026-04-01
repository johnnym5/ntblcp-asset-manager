/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Identifies the functional role of a row based on Column A behavior and row density.
 */

import { RowClassification } from './types';

const KNOWN_GROUP_KEYWORDS = [
  'GENERAL', 'IT EQUIPMENT', 'PRINTER', 'PMU OFFICE', 'ADDITIONAL ASSETS',
  'GX-IV', 'TRANSFERRED ASSETS', 'COMPUTERS', 'IT-EQUIPMENTS', 'INHERITED ASSESTS',
  'MOTOR VEHICLES', 'GENEXPERT MACHINES', 'ADDITIONS', 'MOTORBIKES', 'PDX',
  'TB LAMP', 'TRUENAT', 'SAMSUNG GALAXY TABLETS', 'ECG MACHINE'
];

export function classifyRow(row: any[]): RowClassification {
  if (!row || row.length === 0 || row.every(cell => cell === null || String(cell).trim() === '')) {
    return 'EMPTY';
  }

  const colA = String(row[0] || '').trim();
  const colA_Upper = colA.toUpperCase();
  
  // 1. SCHEMA_HEADER: Explicitly identifies the start of a data block
  // Matches "S/N", "S.N", "SN", etc.
  if (colA_Upper === 'S/N' || colA_Upper === 'SN' || colA_Upper === 'S.N') {
    return 'SCHEMA_HEADER';
  }

  // 2. GROUP_HEADER: Functional section boundary in Column A
  const populatedCount = row.filter(c => c !== null && String(c).trim() !== '').length;
  
  // Rule: High probability if Col A matches known structural keywords
  const isKeywordMatch = KNOWN_GROUP_KEYWORDS.some(k => colA_Upper.includes(k));
  
  // Rule: standalone label in Column A with low density across the rest of the row
  if (colA && (isKeywordMatch || populatedCount <= 2)) {
    // Avoid misclassifying actual data (like a single ID or numeric S/N) as a group header
    if (colA.length > 3 && isNaN(Number(colA))) {
      return 'GROUP_HEADER';
    }
  }

  // 3. DATA_ROW: High density following a schema anchor
  if (populatedCount >= 3) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}
