'use client';

/**
 * @fileOverview High-Fidelity NTBLCP Structural Parser Engine.
 * Implements two-stage structural discovery and group-aware mapping for single-sheet registries.
 * Phase 700: implements Synthetic Template logic for headerless groups.
 */

import { v4 as uuidv4 } from 'uuid';
import { classifyRow } from './classifyRow';
import { normalizeHeaderName } from '@/lib/registry-utils';
import type { 
  ParsedAsset, 
  HeaderTemplate,
  DiscoveredGroup,
  GroupImportContainer,
  HeaderSource,
  HeaderSetType
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
   * Traverses a single sheet to identify every group block in Column A.
   */
  public discoverGroups(sheetName: string, data: any[][]): DiscoveredGroup[] {
    const discovered: DiscoveredGroup[] = [];
    let pendingGroupLabel: string | null = null;
    let activeGroup: DiscoveredGroup | null = null;
    
    data.forEach((row, idx) => {
      const type = classifyRow(row);

      // 1. Capture Group Marker from Column A
      if (type === 'GROUP_HEADER') {
        if (activeGroup) activeGroup.endRow = idx - 1;
        pendingGroupLabel = String(row[0]).trim();
      }

      // 2. Capture Explicit Header Row (S/N Signature)
      if (type === 'SCHEMA_HEADER') {
        const signature = this.registerTemplate(row, 'real_template');
        const tpl = this.templates.get(signature)!;
        const name = pendingGroupLabel || "GENERAL REGISTER";
        
        activeGroup = this.createNewGroup(name, tpl, 'explicit', idx, sheetName);
        activeGroup.headerStart = idx;
        activeGroup.headerEnd = idx;
        discovered.push(activeGroup);
        pendingGroupLabel = null; 
      }

      // 3. Handle Headerless Group (Starts directly with asset rows)
      if (type === 'DATA_ROW' && pendingGroupLabel) {
        // Attempt to match width with existing templates (Inferred)
        // Else generate a new one (Synthetic)
        const matchedTpl = this.matchOrGenerateTemplate(row);
        
        activeGroup = this.createNewGroup(
          pendingGroupLabel, 
          matchedTpl, 
          matchedTpl.type === 'inferred_template' ? 'inferred' : 'synthetic', 
          idx, 
          sheetName
        );
        discovered.push(activeGroup);
        pendingGroupLabel = null;
      }
    });

    // Asset Count Pulse & Boundary Finalization
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
   * Maps rows using the templates discovered or generated in Stage 1.
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
          const asset = this.mapRowToTemplate(row, tpl, group, i);
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

  private createNewGroup(name: string, tpl: HeaderTemplate, source: HeaderSource, start: number, sheet: string): DiscoveredGroup {
    return {
      id: uuidv4(),
      groupName: name,
      headerSet: tpl.rawHeaders,
      headerSource: source,
      headerSetType: tpl.type,
      columnCount: tpl.columnCount,
      rowCount: 0,
      startRow: start,
      endRow: 0,
      headerStart: null,
      headerEnd: null,
      rawText: name,
      visibleHeaderRow: source === 'explicit' ? tpl.rawHeaders : null,
      templateId: tpl.id,
      sheetName: sheet,
      workbookName: this.workbookName
    };
  }

  private registerTemplate(row: any[], type: HeaderSetType): string {
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
        signature,
        type
      });
    }
    return signature;
  }

  private matchOrGenerateTemplate(row: any[]): HeaderTemplate {
    const populatedCount = row.filter(c => c !== null && String(c).trim() !== '').length;
    
    // 1. Try to find a width-matched explicit template (Inferred)
    for (const tpl of this.templates.values()) {
      if (tpl.columnCount === row.length || Math.abs(tpl.columnCount - populatedCount) <= 1) {
        return { ...tpl, type: 'inferred_template' };
      }
    }

    // 2. Generate a Synthetic Template (Synthetic)
    const syntheticHeaders = row.map((_, i) => `Synthetic Column ${i + 1}`);
    const signature = `SYNTH_${row.length}`;
    
    if (!this.templates.has(signature)) {
      const tplId = `GEN_${this.templates.size + 1}`;
      this.templates.set(signature, {
        id: tplId,
        rawHeaders: syntheticHeaders,
        normalizedHeaders: syntheticHeaders.map(normalizeHeaderName),
        columnCount: row.length,
        signature,
        type: 'generated_template'
      });
    }
    return this.templates.get(signature)!;
  }

  private mapRowToTemplate(row: any[], tpl: HeaderTemplate, group: DiscoveredGroup, rowNum: number): ParsedAsset | null {
    const asset: any = {
      id: uuidv4(),
      category: group.sheetName,
      description: '',
      grantId: 'STAGED',
      section: group.groupName,
      subsection: 'Base Register',
      assetFamily: 'Uncategorized',
      status: 'UNVERIFIED',
      condition: 'New',
      lastModified: new Date().toISOString(),
      lastModifiedBy: 'Structural Parser',
      hierarchy: { document: group.sheetName, section: group.groupName, subsection: 'Base Register', assetFamily: 'Uncategorized' },
      importMetadata: { sourceFile: this.workbookName, sheetName: group.sheetName, rowNumber: rowNum + 1, importedAt: new Date().toISOString() },
      metadata: {},
      validation: { warnings: [], errors: [], duplicateFlags: [], needsReview: false, isRejected: false, logs: [] },
      headerSource: group.headerSource,
      headerSetType: group.headerSetType,
      sourceGroup: group.groupName,
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
