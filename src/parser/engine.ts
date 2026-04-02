'use client';

/**
 * @fileOverview High-Fidelity NTBLCP Structural Parser Engine.
 * Implements two-stage structural discovery and group-aware mapping for single-sheet registries.
 * Phase 800: Unified key mapping to fix registry data alignment issue.
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
   */
  public discoverGroups(sheetName: string, data: any[][]): DiscoveredGroup[] {
    const discovered: DiscoveredGroup[] = [];
    let pendingGroupLabel: string | null = null;
    let activeGroup: DiscoveredGroup | null = null;
    
    data.forEach((row, idx) => {
      const type = classifyRow(row);

      if (type === 'GROUP_HEADER') {
        if (activeGroup) activeGroup.endRow = idx - 1;
        pendingGroupLabel = String(row[0]).trim();
      }

      if (type === 'SCHEMA_HEADER') {
        const signature = this.registerTemplate(row, 'real_template');
        const tpl = this.templates.get(signature)!;
        const name = pendingGroupLabel || "GENERAL";
        
        activeGroup = this.createNewGroup(name, tpl, 'explicit', idx, sheetName);
        activeGroup.headerStart = idx;
        activeGroup.headerEnd = idx;
        discovered.push(activeGroup);
        pendingGroupLabel = null; 
      }

      if (type === 'DATA_ROW' && pendingGroupLabel) {
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
    for (const tpl of this.templates.values()) {
      if (tpl.columnCount === row.length || Math.abs(tpl.columnCount - populatedCount) <= 1) {
        return { ...tpl, type: 'inferred_template' };
      }
    }
    const syntheticHeaders = row.map((_, i) => `Col ${i + 1}`);
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
      sn: '',
      category: group.groupName, // Use group name as the logical category
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

    // AUTHORITATIVE KEY MAPPING Pulse
    const fieldMapping: Record<string, keyof Asset> = {
      'sn': 'sn' as any,
      'asset_description': 'description' as any,
      'location': 'location' as any,
      'lga': 'lga' as any,
      'assignee_location': 'custodian' as any,
      'asset_id_code': 'assetIdCode' as any,
      'serial_number': 'serialNumber' as any,
      'manufacturer': 'manufacturer' as any,
      'model_number': 'modelNumber' as any,
      'date_purchased_received': 'purchaseDate' as any,
      'purchase_price_ngn': 'value' as any,
      'condition': 'condition' as any,
      'remarks': 'remarks' as any,
      'chasis_no': 'chassisNo' as any,
      'chassis_no': 'chassisNo' as any,
      'engine_no': 'engineNo' as any,
      'site': 'site' as any
    };

    tpl.normalizedHeaders.forEach((key, idx) => {
      const val = row[idx];
      const headerLabel = tpl.rawHeaders[idx];
      if (val === undefined || val === null) return;
      
      const strVal = String(val).trim();
      const targetProp = fieldMapping[key];

      if (targetProp) {
        if (targetProp === 'value') {
          const numericVal = parseFloat(strVal.replace(/[^0-9.]/g, ''));
          asset[targetProp] = isNaN(numericVal) ? 0 : numericVal;
        } else {
          (asset as any)[targetProp] = strVal;
        }
      } else {
        asset.metadata[headerLabel] = val;
      }
    });

    if (!asset.description && !asset.assetIdCode && !asset.serialNumber) return null;
    return asset as ParsedAsset;
  }
}
