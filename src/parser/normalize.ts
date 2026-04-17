/**
 * @fileOverview Data Normalization Engine.
 * Maps raw spreadsheet rows to strict Domain Asset models.
 */

import { REGISTRY_MAPPING_CONTRACT } from './contracts/mapping';
import type { Asset } from '@/types/domain';
import { v4 as uuidv4 } from 'uuid';

export function normalizeRow(
  row: any[], 
  headerRow: any[], 
  context: Partial<Asset>,
  customMapping?: Record<string, string>
): Partial<Asset> {
  const asset: any = {
    id: uuidv4(),
    ...context,
    metadata: {},
    status: 'UNVERIFIED',
    condition: 'Unassessed',
    lastModified: new Date().toISOString(),
    lastModifiedBy: context.lastModifiedBy || 'System Import',
  };

  const activeMapping = customMapping || REGISTRY_MAPPING_CONTRACT;

  headerRow.forEach((rawHeader, index) => {
    if (!rawHeader) return;
    const headerString = String(rawHeader).trim();
    const normalizedKey = headerString.toUpperCase();
    
    // Check custom mapping first, then fall back to contract, then to metadata
    const fieldName = customMapping ? customMapping[headerString] : (REGISTRY_MAPPING_CONTRACT as any)[normalizedKey];
    const cellValue = row[index];

    if (fieldName && fieldName !== 'metadata') {
      asset[fieldName] = cellValue !== null && cellValue !== undefined ? String(cellValue).trim() : '';
    } else if (cellValue !== null && cellValue !== undefined) {
      // Collect unmapped columns into metadata for fidelity
      asset.metadata[headerString] = cellValue;
    }
  });

  // Ensure name is at least populated from description for parity
  if (!asset.name && asset.description) {
    asset.name = asset.description;
  }

  return asset;
}
