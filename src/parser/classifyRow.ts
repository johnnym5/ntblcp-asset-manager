/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Identifies the functional role of a row based on Column A behavior and row density.
 */

import { RowClassification } from './types';

const SCHEMA_ANCHORS = ['S/N', 'SN', 'S.N', 'SERIAL NO', 'SERIAL NUMBER'];

export function classifyRow(row: any[]): RowClassification {
  if (!row || row.length === 0 || row.every(cell => cell === null || String(cell).trim() === '')) {
    return 'EMPTY';
  }

  const firstCell = String(row[0] || '').trim().toUpperCase();
  const populatedCount = row.filter(c => c !== null && String(c).trim() !== '').length;

  // 1. SCHEMA_HEADER: Explicitly starts with S/N
  if (SCHEMA_ANCHORS.includes(firstCell)) {
    return 'SCHEMA_HEADER';
  }

  // 2. GROUP_HEADER: Significant label in Column A with low overall row density
  // OR a known structural keyword like "GENERAL" or "2024 ADDITIONS"
  const isNumeric = firstCell !== '' && !isNaN(Number(firstCell));
  if (firstCell !== '' && !isNumeric && populatedCount <= 3) {
    return 'GROUP_HEADER';
  }

  // 3. DATA_ROW: Starts with a number or belongs to an active data block
  if (isNumeric || populatedCount >= 4) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}
