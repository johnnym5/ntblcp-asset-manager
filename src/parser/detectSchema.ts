/**
 * @fileOverview Schema Detection Engine.
 * Identifies which registry template a row belongs to.
 * Phase 53: Enhanced to detect sub-table signatures mid-sheet.
 */

import { HEADER_DEFINITIONS, SUB_TABLE_SIGNATURES } from '@/lib/constants';

export function detectSchema(row: any[]): string | null {
  const normalizedRow = row.map(c => String(c || '').trim().toUpperCase());
  
  let bestMatch: { name: string; score: number } | null = null;

  // 1. Check Primary Definitions
  for (const [name, definition] of Object.entries(HEADER_DEFINITIONS)) {
    const normalizedHeaders = definition.headers.map(h => h.toUpperCase());
    const matches = normalizedRow.filter(h => normalizedHeaders.includes(h)).length;
    const score = matches / definition.headers.length;

    if (score >= 0.7 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { name, score };
    }
  }

  // 2. Check Sub-Table Signatures (Mid-sheet pivots)
  for (const [name, signature] of Object.entries(SUB_TABLE_SIGNATURES)) {
    const normalizedSignature = signature.map(h => h.toUpperCase());
    const matches = normalizedRow.filter(h => normalizedSignature.includes(h)).length;
    const score = matches / signature.length;

    if (score >= 0.8 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { name, score };
    }
  }

  return bestMatch?.name || null;
}
