/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Rules:
 * 1. Column A standalone text = potential GROUP_HEADER.
 * 2. Starts with S/N = SCHEMA_HEADER.
 * 3. Populated row after header = DATA_ROW.
 */

import { RowClassification } from './types';

const KNOWN_GROUPS = [
  'GENERAL', 'IT EQUIPMENT', 'PRINTER MACHINE', 'PMU OFFICE', 'ADDITIONAL ASSETS',
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
  
  // 1. Check for SCHEMA_HEADER (Must start with S/N or equivalent)
  if (colA_Upper === 'S/N' || colA_Upper === 'SN') {
    return 'SCHEMA_HEADER';
  }

  // 2. Check for GROUP_HEADER
  // Rule: High visibility in Column A, low density in rest of row
  const populatedCount = row.filter(c => c !== null && String(c).trim() !== '').length;
  const isKnownGroup = KNOWN_GROUPS.some(k => colA_Upper.includes(k));
  
  if (colA && (isKnownGroup || populatedCount <= 2)) {
    // Ensure it's not just a serial number or short description
    if (colA.length > 3 && isNaN(Number(colA))) {
      return 'GROUP_HEADER';
    }
  }

  // 3. DATA_ROW
  if (populatedCount >= 3) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}
