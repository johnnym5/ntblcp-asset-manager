/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Identifies the functional role of a row based on Column A behavior and row density.
 * Phase 360: Hardened for NTBLCP single-sheet padded registers.
 */

import { RowClassification } from './types';

const SCHEMA_ANCHORS = [
  'S/N', 'SN', 'S.N', 'SERIAL NO', 'SERIAL NUMBER', 
  'S/NO', 'S / N', 'S / NO', 'SERIAL', 'TAG NUMBER', 'ASSETS TAG NO'
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
  // Must have significant population to be a header row
  if (normalizedAnchors.some(anchor => firstCell === anchor || firstCell.startsWith(anchor))) {
    if (populatedCount >= 4) {
      return 'SCHEMA_HEADER';
    }
  }

  // 2. GROUP_HEADER: Significant label in Column A with low density
  // In NTBLCP workbooks, these are rows like "IT EQUIPMENT" or "GENERAL"
  if (firstCellRaw !== '' && !isNumeric && populatedCount <= 4) {
    // Noise filter for common non-title text
    const lower = firstCellRaw.toLowerCase();
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

  // 3. DATA_ROW: Starts with a number or belongs to an active data block
  if (isNumeric || (populatedCount >= 6)) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}
