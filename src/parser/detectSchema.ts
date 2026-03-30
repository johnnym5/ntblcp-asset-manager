/**
 * @fileOverview Schema Detection Engine.
 * Identifies which registry template a row belongs to.
 */

import { HEADER_DEFINITIONS } from '@/lib/constants';

export function detectSchema(row: any[]): string | null {
  const normalizedRow = row.map(c => String(c || '').trim().toUpperCase());
  
  let bestMatch: { name: string; score: number } | null = null;

  for (const [name, definition] of Object.entries(HEADER_DEFINITIONS)) {
    const normalizedHeaders = definition.headers.map(h => h.toUpperCase());
    const matches = normalizedRow.filter(h => normalizedHeaders.includes(h)).length;
    const score = matches / definition.headers.length;

    if (score >= 0.7 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { name, score };
    }
  }

  return bestMatch?.name || null;
}
