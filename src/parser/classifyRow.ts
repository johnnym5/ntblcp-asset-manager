/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Identifies the functional role of a row based on Column A behavior and row density.
 * Phase 700: Hardened for Column A standalone markers and low-density section labels.
 */

import { RowClassification } from './types';

const SCHEMA_ANCHORS = [
  'S/N', 'SN', 'S.N', 'SERIAL NO', 'SERIAL NUMBER', 
  'S/NO', 'S / N', 'S / NO', 'SERIAL', 'TAG NUMBER', 
  'ASSETS TAG NO', 'TAG NUMBERS'
];

const KNOWN_MARKERS = [
  'GENERAL', 'IT EQUIPMENT', 'PRINTER MACHINE', 'PMU OFFICE CABINET',
  'PMU OFFICE EQUIPMENT', 'ADDITIONAL ASSETS', 'GX-IV', 'TRANSFERRED ASSETS',
  'LSTBLCP_', 'LSMOH', 'IHVN_', 'COMPUTERS', 'IT-EQUIPMENTS', 'INHERITED ASSESTS',
  'FHI360', 'GENEXPERT MACHINES', 'ADDITIONS', 'MOTORBIKES', 'PDX', 'TB LAMP',
  'TRUENAT', 'SAMSUNG GALAXY TABLETS', 'ECG MACHINE'
];

export function classifyRow(row: any[]): RowClassification {
  if (!row || row.length === 0 || row.every(cell => cell === null || String(cell).trim() === '')) {
    return 'EMPTY';
  }

  // Normalize Column A for authority checking
  const firstCellRaw = String(row[0] || '').trim();
  const firstCellUpper = firstCellRaw.toUpperCase();
  const firstCellNoSpace = firstCellUpper.replace(/\s+/g, '');
  
  const populatedCount = row.filter(c => c !== null && String(c).trim() !== '').length;
  const isNumericColA = firstCellRaw !== '' && !isNaN(Number(firstCellRaw));

  // 1. SCHEMA_HEADER: Explicitly starts with S/N or variations
  // Requirements: High density (>=4 cols) AND Column A starts with anchor.
  const normalizedAnchors = SCHEMA_ANCHORS.map(a => a.replace(/\s+/g, ''));
  if (normalizedAnchors.some(anchor => firstCellNoSpace === anchor || firstCellNoSpace.startsWith(anchor))) {
    if (populatedCount >= 4) {
      return 'SCHEMA_HEADER';
    }
  }

  // 2. GROUP_HEADER: Structural marker in Column A
  // Rules: Column A text matches known markers OR is a standalone label (low density).
  const isKnownMarker = KNOWN_MARKERS.some(m => firstCellUpper.includes(m));
  if (firstCellRaw !== '' && !isNumericColA) {
    // If it's a known keyword, it's a header regardless of density
    if (isKnownMarker) return 'GROUP_HEADER';
    
    // Standalone text in Col A with low density is usually a section label
    if (populatedCount <= 3) {
      // Noise suppression
      const lower = firstCellRaw.toLowerCase();
      if (['sn', 's/n', 'total', 'page', 'date'].includes(lower)) return 'UNKNOWN';
      return 'GROUP_HEADER';
    }
  }

  // 3. DATA_ROW: Likely an asset record
  // Rules: Starts with a number OR is a high-density row not otherwise classified.
  if (isNumericColA || (populatedCount >= 5)) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}
