/**
 * @fileOverview Hierarchy Orchestrator.
 * Maintains stateful context during spreadsheet traversal.
 */

import { classifyRow } from './classifyRow';
import { normalizeRow } from './normalize';
import { detectSchema } from './detectSchema';
import { HEADER_DEFINITIONS } from '@/lib/constants';
import type { Asset, SectionHierarchy } from '@/types/domain';

/**
 * Parses an entire sheet data array into an array of strictly typed Assets.
 * Maintains context for hierarchical markers throughout the process.
 */
export function parseSheetToAssets(
  sheetData: any[][], 
  sourceFileName: string, 
  sheetName: string,
  customMapping?: Record<string, string>
): Asset[] {
  const assets: Asset[] = [];
  
  let currentHierarchy: SectionHierarchy = {
    document: sheetName,
    section: 'General',
    subsection: 'Base Register',
    assetFamily: 'Uncategorized'
  };

  let activeHeaderRow: any[] | null = null;
  let currentDefinitionName: string | null = null;

  for (let i = 0; i < sheetData.length; i++) {
    const row = sheetData[i];
    if (!row || !Array.isArray(row)) continue;

    // Detect Schema change or initialization
    const potentialSchema = detectSchema(row);
    if (potentialSchema) {
      currentDefinitionName = potentialSchema;
      activeHeaderRow = row;
      continue;
    }

    // Classify using current definition headers if available, otherwise empty
    const defHeaders = currentDefinitionName ? HEADER_DEFINITIONS[currentDefinitionName].headers : [];
    const classification = classifyRow(row, defHeaders);

    switch (classification.type) {
      case 'MAJOR_SECTION':
        currentHierarchy.section = classification.label || 'General';
        currentHierarchy.subsection = 'Base Register';
        currentHierarchy.assetFamily = 'Uncategorized';
        break;
      
      case 'TEMPORAL_SUBSECTION':
        currentHierarchy.subsection = classification.label || 'Additions';
        break;

      case 'QUANTITY_BATCH':
        currentHierarchy.assetFamily = classification.label || 'Uncategorized';
        break;

      case 'DATA_ROW':
        if (activeHeaderRow) {
          const normalized = normalizeRow(row, activeHeaderRow, {
            category: currentDefinitionName || 'Unclassified',
            hierarchy: { ...currentHierarchy },
            importMetadata: {
              sourceFile: sourceFileName,
              sheetName: sheetName,
              rowNumber: i + 1,
              importedAt: new Date().toISOString()
            }
          } as any, customMapping);
          assets.push(normalized as Asset);
        }
        break;
      
      default:
        // Skip unknown or empty rows
        break;
    }
  }

  return assets;
}
