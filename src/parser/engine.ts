'use client';

/**
 * @fileOverview High-Fidelity NTBLCP Structural Parser Engine.
 * Implements two-stage structural discovery and positional mapping for single-sheet registries.
 * Phase 600: Strictly ignores workbook-level sheets and focuses on internal group blocks.
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
  private existingAssets: Asset[];

  constructor(workbookName: string, existingAssets: Asset[] = []) {
    this.workbookName = workbookName;
    this.existingAssets = existingAssets;
  }

  /**
   * STAGE 1: Template Detection & Structural Inventory Pulse.
   * Traverses a single sheet to identify repeating group blocks in Column A.
   */
  public discoverGroups(sheetName: string, data: any[][]): DiscoveredGroup[] {
    const discovered: DiscoveredGroup[] = [];
    let pendingGroupName: string | null = null;
    let activeGroup: DiscoveredGroup | null = null;
    
    data.forEach((row, idx) => {
      const type = classifyRow(row);

      // 1. Detect Group Title Pulse (Column A Authority)
      if (type === 'GROUP_HEADER') {
        if (activeGroup) {
          activeGroup.endRow = idx - 1;
        }
        pendingGroupName = String(row[0]).trim();
      }

      // 2. Detect Header Row Pulse (Explicit S/N anchor)
      if (type === 'SCHEMA_HEADER') {
        const signature = this.registerTemplate(row);
        const tpl = this.templates.get(signature)!;

        // The previous group header (if any) or a default starts the group at this header row
        const name = pendingGroupName || "GENERAL REGISTER";
        
        activeGroup = {
          id: uuidv4(),
          groupName: name,
          headerSet: tpl.rawHeaders,
          headerSource: 'explicit',
          columnCount: tpl.columnCount,
          rowCount: 0,
          startRow: idx, 
          endRow: data.length - 1,
          headerStart: idx,
          headerEnd: idx,
          rawText: name,
          visibleHeaderRow: tpl.rawHeaders,
          templateId: tpl.id,
          sheetName,
          workbookName: this.workbookName
        };
        discovered.push(activeGroup);
        pendingGroupName = null; 
      }

      // 3. Handle Inferred Headers (Group starts directly with asset rows)
      if (type === 'DATA_ROW' && pendingGroupName) {
        const inferredTpl = this.inferTemplate(row);
        
        activeGroup = {
          id: uuidv4(),
          groupName: pendingGroupName,
          headerSet: inferredTpl.rawHeaders,
          headerSource: 'inferred',
          columnCount: inferredTpl.columnCount,
          rowCount: 0,
          startRow: idx,
          endRow: data.length - 1,
          headerStart: null,
          headerEnd: null,
          rawText: pendingGroupName,
          visibleHeaderRow: null,
          templateId: inferredTpl.id,
          sheetName,
          workbookName: this.workbookName,
          notes: "Template matched via structural similarity pulse."
        };
        discovered.push(activeGroup);
        pendingGroupName = null;
      }
    });

    // Asset Count Pulse: Re-traversing discovered boundaries to count data rows
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
   * STAGE 2: Targeted Group Ingestion.
   * Replays the data rows using the templates discovered in Stage 1.
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
          } else {
            container.metrics.invalid++;
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
    for (const tpl of this.templates.values()) {
      if (Math.abs(tpl.columnCount - populatedCount) <= 2) return tpl;
    }
    const templates = Array.from(this.templates.values());
    return templates[0] || {
      id: 'FALLBACK',
      rawHeaders: ['Inferred Fields'],
      normalizedHeaders: ['metadata'],
      columnCount: row.length,
      signature: 'FALLBACK'
    };
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
      hierarchy: { document: sheet, section: group, subsection: 'Base Register', assetFamily: 'Uncategorized' },
      importMetadata: { sourceFile: this.workbookName, sheetName: sheet, rowNumber: rowNum + 1, importedAt: new Date().toISOString() },
      metadata: {},
      validation: { warnings: [], errors: [], duplicateFlags: [], needsReview: false, isRejected: false, logs: [] },
      sourceGroup: group,
      templateId: tpl.id
    };

    tpl.normalizedHeaders.forEach((key, idx) => {
      const val = row[idx];
      const headerLabel = tpl.rawHeaders[idx];
      if (val === undefined || val === null) return;
      
      const strVal = String(val).trim();
      if (['sn', 'description', 'location', 'custodian', 'assetIdCode', 'serialNumber', 'manufacturer', 'modelNumber', 'purchaseDate', 'value', 'condition', 'remarks', 'lga', 'site', 'chassisNo', 'engineNo'].includes(key)) {
        asset[key] = strVal;
      } else {
        asset.metadata[headerLabel] = val;
      }
    });

    if (!asset.description && !asset.assetIdCode && !asset.serialNumber) return null;
    return asset as ParsedAsset;
  }
}
