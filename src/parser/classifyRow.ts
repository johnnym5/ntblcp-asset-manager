/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Identifies the functional role of a row based on Column A behavior and row density.
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

  // 1. SCHEMA_HEADER: Explicitly starts with S/N or variations
  if (normalizedAnchors.some(anchor => firstCell === anchor || firstCell.startsWith(anchor))) {
    // Double check: headers usually have high density
    if (populatedCount >= 3) {
      return 'SCHEMA_HEADER';
    }
  }

  // 2. GROUP_HEADER: Significant label in Column A with low density
  // These are section titles like "MOTOR VEHICLES" or "2024 ADDITIONS"
  const isNumeric = firstCellRaw !== '' && !isNaN(Number(firstCellRaw));
  if (firstCellRaw !== '' && !isNumeric && populatedCount <= 3) {
    // Noise filter for common non-title text
    const lower = firstCellRaw.toLowerCase();
    if (!lower.includes('total') && !lower.includes('page') && !lower.includes('grand')) {
      return 'GROUP_HEADER';
    }
  }

  // 3. DATA_ROW: Starts with a number or belongs to an active data block
  if (isNumeric || (populatedCount >= 4)) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}
