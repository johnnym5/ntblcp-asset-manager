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
  context: Partial<Asset>
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

  headerRow.forEach((rawHeader, index) => {
    if (!rawHeader) return;
    const normalizedHeader = String(rawHeader).trim().toUpperCase();
    const fieldName = REGISTRY_MAPPING_CONTRACT[normalizedHeader];
    const cellValue = row[index];

    if (fieldName) {
      asset[fieldName] = cellValue !== null && cellValue !== undefined ? String(cellValue).trim() : '';
    } else if (cellValue !== null && cellValue !== undefined) {
      // Collect unmapped columns into metadata for fidelity
      asset.metadata[normalizedHeader] = cellValue;
    }
  });

  // Ensure name is at least populated from description for parity
  if (!asset.name && asset.description) {
    asset.name = asset.description;
  }

  return asset;
}
