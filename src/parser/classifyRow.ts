/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Identifies the functional role of a row based on Column A behavior and row density.
 * Phase 185: Expanded SCHEMA_HEADER triggers and reduced DATA_ROW density threshold.
 */

import { RowClassification } from './types';

const KNOWN_GROUP_KEYWORDS = [
  'GENERAL', 'IT EQUIPMENT', 'PRINTER', 'PMU OFFICE', 'ADDITIONAL ASSETS',
  'GX-IV', 'TRANSFERRED ASSETS', 'COMPUTERS', 'IT-EQUIPMENTS', 'INHERITED ASSESTS',
  'MOTOR VEHICLES', 'GENEXPERT MACHINES', 'ADDITIONS', 'MOTORBIKES', 'PDX',
  'TB LAMP', 'TRUENAT', 'SAMSUNG GALAXY TABLETS', 'ECG MACHINE'
];

const SCHEMA_ANCHORS = [
  'S/N', 'SN', 'S.N', 'SERIAL NO', 'SERIAL NUMBER', 
  'STATE', 'LOCATION', 'DATE', 'ASSET', 'TAG'
];

export function classifyRow(row: any[]): RowClassification {
  if (!row || row.length === 0 || row.every(cell => cell === null || String(cell).trim() === '')) {
    return 'EMPTY';
  }

  const colA = String(row[0] || '').trim();
  const colA_Upper = colA.toUpperCase();
  
  // 1. SCHEMA_HEADER: Explicitly identifies the start of a data block
  if (SCHEMA_ANCHORS.some(anchor => colA_Upper === anchor)) {
    return 'SCHEMA_HEADER';
  }

  const populatedCount = row.filter(c => c !== null && String(c).trim() !== '').length;

  // 2. GROUP_HEADER: Structural section boundary in Column A
  // A group header is usually a standalone label in Col A that is NOT a number.
  const isKeywordMatch = KNOWN_GROUP_KEYWORDS.some(k => colA_Upper.includes(k));
  const isStandaloneColA = colA && populatedCount <= 2;
  const isNotNumber = isNaN(Number(colA));

  if (isStandaloneColA && isNotNumber && (isKeywordMatch || colA.length > 5)) {
    // Basic length guard to avoid misclassifying very short text fragments
    return 'GROUP_HEADER';
  }

  // 3. DATA_ROW: Any row with content that isn't a header or group boundary
  if (populatedCount >= 1) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}
