/**
 * @fileOverview Deterministic Structural Row Classifier.
 * Identifies the functional role of a row based on Column A behavior and row density.
 * Phase 701: Relaxed density requirements to prevent data loss in legacy transfers.
 * Phase 702: Hardened header detection for "ASSETS TAG NO" variants.
 */

import { RowClassification } from './types';

const SCHEMA_ANCHORS = [
  'S/N', 'SN', 'S.N', 'SERIAL NO', 'SERIAL NUMBER', 
  'S/NO', 'S / N', 'S / NO', 'SERIAL', 'TAG NUMBER', 
  'ASSETS TAG NO', 'TAG NUMBERS', 'TAG NO'
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

  const firstCellRaw = String(row[0] || '').trim();
  const firstCellUpper = firstCellRaw.toUpperCase();
  const firstCellNoSpace = firstCellUpper.replace(/\s+/g, '');
  
  const populatedCount = row.filter(c => c !== null && String(c).trim() !== '').length;
  const isNumericColA = firstCellRaw !== '' && !isNaN(Number(firstCellRaw));

  // 1. SCHEMA_HEADER
  // Recognize "ASSETS TAG NO" and similar as anchors even if they aren't strictly Col A.
  const normalizedAnchors = SCHEMA_ANCHORS.map(a => a.replace(/\s+/g, ''));
  if (normalizedAnchors.some(anchor => firstCellNoSpace === anchor || firstCellNoSpace.startsWith(anchor))) {
    if (populatedCount >= 3) {
      return 'SCHEMA_HEADER';
    }
  }

  // 2. GROUP_HEADER
  const isKnownMarker = KNOWN_MARKERS.some(m => firstCellUpper.includes(m));
  if (firstCellRaw !== '' && !isNumericColA) {
    if (isKnownMarker) return 'GROUP_HEADER';
    
    // Standalone text in Col A with low density is usually a section label
    if (populatedCount <= 3) {
      const lower = firstCellRaw.toLowerCase();
      if (['sn', 's/n', 'total', 'page', 'date'].includes(lower)) return 'UNKNOWN';
      return 'GROUP_HEADER';
    }
  }

  // 3. DATA_ROW
  // Lowered requirements: if it starts with a number or has decent density, it's an asset.
  if (isNumericColA || (populatedCount >= 3)) {
    return 'DATA_ROW';
  }

  return 'UNKNOWN';
}
