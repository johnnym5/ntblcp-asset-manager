/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Identifies the functional role of a row based on Column A behavior and row density.
 * Phase 500: Hardened for Column A priority and structural group detection.
 */

import { RowClassification } from './types';

const SCHEMA_ANCHORS = [
  'S/N', 'SN', 'S.N', 'SERIAL NO', 'SERIAL NUMBER', 
  'S/NO', 'S / N', 'S / NO', 'SERIAL', 'TAG NUMBER', 
  'ASSETS TAG NO', 'TAG NUMBERS'
];

export function classifyRow(row: any[]): RowClassification {
  if (!row || row.length === 0 || row.every(cell => cell === null || String(cell).trim() === '')) {
    return 'EMPTY';
  }

  // Normalize Column A for anchor checking
  const firstCellRaw = String(row[0] || '').trim();
  const firstCell = firstCellRaw.toUpperCase().replace(/\s+/g, '');
  const normalizedAnchors = SCHEMA_ANCHORS.map(a => a.replace(/\s+/g, ''));

  const populatedCount = row.filter(c => c !== null && String(c).trim() !== '').length;
  const isNumeric = firstCellRaw !== '' && !isNaN(Number(firstCellRaw));

  // 1. SCHEMA_HEADER: Explicitly starts with S/N or variations
  // Must have significant density to be a table header
  if (normalizedAnchors.some(anchor => firstCell === anchor || firstCell.startsWith(anchor))) {
    if (populatedCount >= 4) {
      return 'SCHEMA_HEADER';
    }
  }

  // 2. GROUP_HEADER: Structural marker in Column A
  // Rules: Stands alone in Col A (or very low density), NOT numeric.
  // This is the primary boundary detection pulse.
  if (firstCellRaw !== '' && !isNumeric && populatedCount <= 3) {
    const lower = firstCellRaw.toLowerCase();
    
    // Ignore known technical noise
    const isNoise = 
      lower === 'sn' || 
      lower === 's/n' || 
      lower.includes('total') || 
      lower.includes('page') || 
      lower.includes('prepared by') ||
      lower.includes('checked by');

    if (!isNoise) {
      return 'GROUP_HEADER';
    }
  }

  // 3. DATA_ROW: Likely an asset record
  // Rules: Starts with a number OR is a high-density row.
  if (isNumeric || (populatedCount >= 5)) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}
