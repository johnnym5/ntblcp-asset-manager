/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Identifies the functional role of a row based on Column A behavior and row density.
 * Phase 315: Hardened keywords and loosened standalone checks for group names.
 */

import { RowClassification } from './types';

const KNOWN_GROUP_KEYWORDS = [
  'GENERAL', 'IT EQUIPMENT', 'PRINTER', 'PMU OFFICE', 'ADDITIONAL ASSETS',
  'GX-IV', 'TRANSFERRED ASSETS', 'COMPUTERS', 'IT-EQUIPMENTS', 'INHERITED ASSESTS',
  'MOTOR VEHICLES', 'GENEXPERT MACHINES', 'ADDITIONS', 'MOTORBIKES', 'PDX',
  'TB LAMP', 'TRUENAT', 'SAMSUNG GALAXY TABLETS', 'ECG MACHINE', 'REGISTER'
];

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

  // 2. DATA_ROW: If Col A is numeric, it is almost certainly an S/N data row in NTBLCP registers
  const isNumericColA = colA !== '' && !isNaN(Number(colA.replace(/[^0-9.]/g, '')));
  if (isNumericColA) {
    return 'DATA_ROW';
  }

  const populatedCount = row.filter(c => c !== null && String(c).trim() !== '').length;

  // 3. GROUP_HEADER: Structural section boundary in Column A
  // Relaxed the populatedCount to 3 to catch group names that might have minor noise in Row B/C
  const isKeywordMatch = KNOWN_GROUP_KEYWORDS.some(k => colA_Upper.includes(k));
  const isStandaloneColA = colA && populatedCount <= 3;

  if (isStandaloneColA && (isKeywordMatch || colA.length > 4)) {
    return 'GROUP_HEADER';
  }

  // 4. DATA_ROW FALLBACK: If there is significant data density, treat as data
  if (populatedCount >= 3) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}