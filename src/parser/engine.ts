'use client';

/**
 * @fileOverview High-Fidelity NTBLCP Structural Parser Engine.
 * Implements two-stage structural discovery and positional mapping.
 * Optimized for TB.xlsx and C19 ASSETS.xlsx.
 */

import { v4 as uuidv4 } from 'uuid';
import { classifyRow } from './classifyRow';
import { normalizeHeaderName } from '@/lib/registry-utils';
import type { 
  ParsedAsset, 
  HeaderTemplate,
  DiscoveredGroup,
  GroupImportContainer
} from './types';
import type { Asset } from '@/types/domain';

export class ParserEngine {
  private templates: Map<string, HeaderTemplate> = new Map();
  private workbookName: string;
  private existingSerials: Set<string>;

  constructor(workbookName: string, existingAssets: Asset[] = []) {
    this.workbookName = workbookName;
    this.existingSerials = new Set(existingAssets.map(a => a.serialNumber).filter(Boolean));
  }

  /**
   * STAGE 1: Template Discovery Pulse.
   * Scans Column A to identify group boundaries and learn header sets.
   */
  public discoverGroups(sheetName: string, data: any[][]): DiscoveredGroup[] {
    const discovered: DiscoveredGroup[] = [];
    let activeGroupName = "START_OF_SHEET";
    let activeGroupStart = 0;
    
    data.forEach((row, idx) => {
      const type = classifyRow(row);

      // 1. Capture Section Title
      if (type === 'GROUP_HEADER') {
        activeGroupName = String(row[0]).trim();
        activeGroupStart = idx;
      }

      // 2. Capture Schema Anchor
      if (type === 'SCHEMA_HEADER') {
        const signature = this.registerTemplate(row);
        const tpl = this.templates.get(signature)!;

        // Finalize previous group end if necessary
        if (discovered.length > 0) {
          discovered[discovered.length - 1].endRow = idx - 1;
        }

        discovered.push({
          id: uuidv4(),
          groupName: activeGroupName,
          headerSet: tpl.rawHeaders,
          headerSource: 'explicit',
          columnCount: tpl.columnCount,
          rowCount: 0,
          startRow: activeGroupStart,
          endRow: data.length - 1,
          headerRowIndex: idx,
          templateId: tpl.id,
          sheetName,
          workbookName: this.workbookName
        });
      }

      // 3. Handle data rows without explicit headers (Inference)
      if (type === 'DATA_ROW' && !this.isInsideActiveGroup(idx, discovered)) {
        // Find best existing template match
        const inferredTpl = this.inferTemplate(row);
        
        discovered.push({
          id: uuidv4(),
          groupName: activeGroupName,
          headerSet: inferredTpl.rawHeaders,
          headerSource: 'inferred',
          columnCount: inferredTpl.columnCount,
          rowCount: 0,
          startRow: activeGroupStart,
          endRow: data.length - 1,
          headerRowIndex: null,
          templateId: inferredTpl.id,
          sheetName,
          workbookName: this.workbookName
        });
      }
    });

    // Asset Count Pulse: Calculate row counts for discovered blocks
    discovered.forEach((group, idx) => {
      const nextGroup = discovered[idx + 1];
      const stopRow = nextGroup ? nextGroup.startRow : data.length;
      
      let count = 0;
      for (let i = group.startRow; i < stopRow; i++) {
        if (classifyRow(data[i]) === 'DATA_ROW') count++;
      }
      group.rowCount = count;
      group.endRow = stopRow - 1;
    });

    return discovered;
  }

  /**
   * STAGE 2: Targeted Ingestion.
   */
  public ingestGroups(sheetName: string, data: any[][], selectedGroups: DiscoveredGroup[]): GroupImportContainer[] {
    const containers: GroupImportContainer[] = [];

    selectedGroups.forEach(group => {
      const tpl = Array.from(this.templates.values()).find(t => t.id === group.templateId);
      if (!tpl) return;

      const container: GroupImportContainer = {
        ...group,
        assets: [],
        metrics: { valid: 0, invalid: 0 }
      };

      for (let i = group.startRow; i <= group.endRow; i++) {
        const row = data[i];
        if (classifyRow(row) === 'DATA_ROW') {
          const asset = this.mapRowToTemplate(row, tpl, group.groupName, i, sheetName);
          if (asset) {
            container.assets.push(asset);
            container.metrics.valid++;
          }
        }
      }

      containers.push(container);
    });

    return containers;
  }

  private registerTemplate(row: any[]): string {
    const lastPopulatedIndex = row.reduce((max, cell, idx) => 
      (cell !== null && String(cell).trim() !== '') ? idx : max, 0);
    
    const rawHeaders = row.slice(0, lastPopulatedIndex + 1).map(c => String(c || '').trim());
    const signature = rawHeaders.map(h => h.toUpperCase()).join('|');
    
    if (!this.templates.has(signature)) {
      const tplId = `TPL_${this.templates.size + 1}`;
      this.templates.set(signature, {
        id: tplId,
        rawHeaders,
        normalizedHeaders: rawHeaders.map(normalizeHeaderName),
        columnCount: rawHeaders.length,
        signature
      });
    }
    return signature;
  }

  private inferTemplate(row: any[]): HeaderTemplate {
    const populatedCount = row.filter(c => c !== null && String(c).trim() !== '').length;
    
    // Search for best match among registered templates
    for (const tpl of this.templates.values()) {
      if (Math.abs(tpl.columnCount - populatedCount) <= 2) {
        return tpl;
      }
    }

    // Create a generic "Fallback" template if no match found
    const signature = `INFERRED_${populatedCount}`;
    if (!this.templates.has(signature)) {
      const tplId = `INFERRED_${this.templates.size + 1}`;
      const mockHeaders = Array.from({ length: row.length }).map((_, i) => `Inferred Col ${i + 1}`);
      this.templates.set(signature, {
        id: tplId,
        rawHeaders: mockHeaders,
        normalizedHeaders: mockHeaders.map(normalizeHeaderName),
        columnCount: row.length,
        signature
      });
    }
    return this.templates.get(signature)!;
  }

  private isInsideActiveGroup(idx: number, groups: DiscoveredGroup[]): boolean {
    return groups.some(g => idx >= g.startRow && idx <= g.endRow);
  }

  private mapRowToTemplate(row: any[], tpl: HeaderTemplate, group: string, rowNum: number, sheet: string): ParsedAsset | null {
    const asset: any = {
      id: uuidv4(),
      category: sheet,
      description: '',
      grantId: 'STAGED',
      section: group,
      subsection: 'Base Register',
      assetFamily: 'Uncategorized',
      status: 'UNVERIFIED',
      condition: 'New',
      lastModified: new Date().toISOString(),
      lastModifiedBy: 'Structural Parser',
      hierarchy: {
        document: sheet,
        section: group,
        subsection: 'Base Register',
        assetFamily: 'Uncategorized'
      },
      importMetadata: {
        sourceFile: this.workbookName,
        sheetName: sheet,
        rowNumber: rowNum + 1,
        importedAt: new Date().toISOString()
      },
      metadata: {},
      validation: {
        warnings: [],
        errors: [],
        duplicateFlags: [],
        needsReview: false,
        isRejected: false,
        logs: []
      },
      sourceGroup: group,
      templateId: tpl.id
    };

    tpl.normalizedHeaders.forEach((key, idx) => {
      const val = row[idx];
      const headerLabel = tpl.rawHeaders[idx];
      if (val === undefined || val === null) return;
      
      const strVal = String(val).trim();
      if (this.isDomainField(key)) {
        asset[key] = strVal;
      } else {
        asset.metadata[headerLabel] = val;
      }
    });

    if (!asset.description && !asset.assetIdCode && !asset.serialNumber) return null;
    return asset as ParsedAsset;
  }

  private isDomainField(key: string): boolean {
    return [
      'sn', 'description', 'location', 'custodian', 'assetIdCode', 
      'serialNumber', 'manufacturer', 'modelNumber', 'purchaseDate', 
      'value', 'condition', 'remarks', 'lga', 'site', 'chassisNo', 'engineNo'
    ].includes(key);
  }
}
