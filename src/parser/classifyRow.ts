/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Identifies the functional role of a row based on Column A behavior and row density.
 * Phase 400: Strict adherence to NTBLCP Workbook structural patterns.
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
  if (normalizedAnchors.some(anchor => firstCell === anchor || firstCell.startsWith(anchor))) {
    // Header rows in NTBLCP registers are high-density
    if (populatedCount >= 4) {
      return 'SCHEMA_HEADER';
    }
  }

  // 2. GROUP_HEADER: Structural marker in Column A
  // Rules: Stands alone in Col A (or very few cells populated), NOT numeric.
  if (firstCellRaw !== '' && !isNumeric && populatedCount <= 3) {
    const lower = firstCellRaw.toLowerCase();
    
    // Noise filtering for technical workbook labels
    const isNoise = 
      lower.includes('total') || 
      lower.includes('page') || 
      lower.includes('grand') || 
      lower.includes('prepared by') ||
      lower.includes('date:');

    if (!isNoise) {
      return 'GROUP_HEADER';
    }
  }

  // 3. DATA_ROW: Likely an asset record
  // Rules: Starts with a number OR is a continuation row in an active block.
  if (isNumeric || (populatedCount >= 5)) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}
