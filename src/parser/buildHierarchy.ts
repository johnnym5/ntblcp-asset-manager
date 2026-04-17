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
  
  // Phase 1: Discover structural groups
  const groups = engine.discoverGroups(sheetName, sheetData);
  if (groups.length === 0) return [];
  
  // Phase 2: Ingest data from discovered groups
  const containers = engine.ingestGroups(sheetName, sheetData, groups);
  
  // Flatten all parsed assets
  return containers.flatMap(c => c.assets) as unknown as Asset[];
}
