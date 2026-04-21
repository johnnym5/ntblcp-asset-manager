/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Identifies the functional role of a row based on Column A behavior and row density.
 * Phase 706: Hardened header anchors for TB register variations.
 */

import { RowClassification } from './types';

const SCHEMA_ANCHORS = [
  'S/N', 'SN', 'S.N', 'SERIAL NO', 'SERIAL NUMBER', 
  'S/NO', 'S / N', 'S / NO', 'SERIAL', 'TAG NUMBER', 
  'ASSETS TAG NO', 'TAG NUMBERS', 'TAG NO', 'STATE', 'LOCATION'
];

const IGNORE_MARKERS = ['TOTAL', 'GRAND TOTAL', 'PAGE', 'DATE', 'PROJECT'];

export function classifyRow(row: any[]): RowClassification {
  if (!row || row.length === 0 || row.every(cell => cell === null || String(cell).trim() === '')) {
    return 'EMPTY';
  }

  const firstCellRaw = String(row[0] || '').trim();
  const firstCellUpper = firstCellRaw.toUpperCase();
  const firstCellNoSpace = firstCellUpper.replace(/\s+/g, '');
  
  const populatedCells = row.filter(c => c !== null && String(c).trim() !== '');
  const populatedCount = populatedCells.length;
  const isNumericColA = firstCellRaw !== '' && !isNaN(Number(firstCellRaw));

  // 1. SCHEMA_HEADER (High density + Keywords)
  const normalizedAnchors = SCHEMA_ANCHORS.map(a => a.replace(/\s+/g, ''));
  if (normalizedAnchors.some(anchor => firstCellNoSpace === anchor || firstCellNoSpace.startsWith(anchor))) {
    // Header rows must have significant density
    if (populatedCount >= 3) {
      return 'SCHEMA_HEADER';
    }
  }

  // 2. GROUP_HEADER (Standalone Title)
  if (firstCellRaw !== '' && !isNumericColA) {
    // If only 1-3 cells are populated and it's not a noise word, it's likely a Title/Folder Name
    if (populatedCount <= 4 && !IGNORE_MARKERS.some(m => firstCellUpper.includes(m))) {
      return 'GROUP_HEADER';
    }
  }

  // 3. DATA_ROW
  if (isNumericColA || (populatedCount >= 5)) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}
