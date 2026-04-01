/**
 * @fileOverview Hierarchy Orchestrator.
 * Refined to use the new structural ParserEngine.
 */

import { ParserEngine } from './engine';
import type { Asset } from '@/types/domain';

/**
 * High-level wrapper for sheet parsing.
 * Uses the deterministic two-stage ParserEngine.
 */
export function parseSheetToAssets(
  sheetData: any[][], 
  sourceFileName: string, 
  sheetName: string,
  existingAssets: Asset[] = []
): Asset[] {
  const engine = new ParserEngine(sourceFileName, existingAssets);
  const result = engine.parseWorkbook(sheetName, sheetData);
  return result.assets;
}
