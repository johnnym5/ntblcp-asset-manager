/**
 * @fileOverview Hierarchy Orchestrator.
 * Refined to use the new structural ParserEngine for deterministic ingestion.
 */

import { ParserEngine } from './engine';
import type { Asset } from '@/types/domain';

/**
 * High-level wrapper for sheet parsing.
 * Uses the deterministic two-stage ParserEngine to discover and import records.
 */
export function parseSheetToAssets(
  sheetData: any[][], 
  sourceFileName: string, 
  sheetName: string,
  existingAssets: Asset[] = []
): Asset[] {
  const engine = new ParserEngine(sourceFileName, existingAssets);
  const result = engine.parseWorkbook(sheetName, sheetData);
  return result.assets as unknown as Asset[];
}
