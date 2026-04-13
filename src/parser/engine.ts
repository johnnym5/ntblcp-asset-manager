'use client';

/**
 * @fileOverview Multi-Sheet Structural Parser Engine.
 * Supports stacked hierarchical blocks: Title Row -> Header Row -> Data Rows.
 * Phase 1110: Implemented multi-block discovery per sheet.
 */

import { v4 as uuidv4 } from 'uuid';
import { classifyRow } from './classifyRow';
import { normalizeHeaderName } from '@/lib/registry-utils';
import { LocationEngine } from '@/services/location-engine';
import { getFuzzySignature } from '@/lib/utils';
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
   * Authoritative entry point for multi-sheet workbook parsing.
   */
  public parseWorkbook(sheetName: string, data: any[][]): GroupImportContainer {
    const groups = this.discoverGroups(sheetName, data);
    const containers = this.ingestGroups(sheetName, data, groups);
    
    // If multiple blocks found, merge them or return primary
    return containers[0] || this.createEmptyContainer(sheetName);
  }

  public discoverGroups(sheetName: string, data: any[][]): DiscoveredGroup[] {
    if (!data || data.length === 0) return [];

    const discovered: DiscoveredGroup[] = [];
    let pendingGroupName: string | null = null;
    let activeGroup: DiscoveredGroup | null = null;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const type = classifyRow(row);

      // 1. Detect Folder Title (Row 1 style)
      if (type === 'GROUP_HEADER') {
        pendingGroupName = String(row[0] || '').trim();
        continue;
      }

      // 2. Detect Schema Header (Row 2 style)
      if (type === 'SCHEMA_HEADER') {
        const signature = this.registerTemplate(row, 'real_template');
        const tpl = this.templates.get(signature)!;
        
        // Finalize previous group if it exists
        if (activeGroup) {
          activeGroup.endRow = i - 1;
        }

        const name = pendingGroupName || sheetName;
        activeGroup = {
          id: uuidv4(),
          groupName: name,
          headerSet: tpl.rawHeaders,
          headerSource: pendingGroupName ? 'explicit' : 'inferred',
          headerSetType: 'real_template',
          columnCount: tpl.columnCount,
          rowCount: 0,
          startRow: i + 1,
          endRow: data.length - 1,
          headerStart: i,
          headerEnd: i,
          rawText: name,
          visibleHeaderRow: tpl.rawHeaders,
          templateId: tpl.id,
          sheetName: sheetName,
          workbookName: this.workbookName
        };
        discovered.push(activeGroup);
        pendingGroupName = null; // Reset for next block
      }
    }

    // Finalize counts
    discovered.forEach(g => {
      const dataRows = data.slice(g.startRow, g.endRow + 1);
      g.rowCount = dataRows.filter(r => classifyRow(r) === 'DATA_ROW').length;
    });

    return discovered;
  }

  public ingestGroups(sheetName: string, data: any[][], selectedGroups: DiscoveredGroup[]): GroupImportContainer[] {
    return selectedGroups.map(group => {
      const tpl = Array.from(this.templates.values()).find(t => t.id === group.templateId);
      const container: GroupImportContainer = { 
        ...group, 
        assets: [], 
        metrics: { valid: 0, invalid: 0, updates: 0, new: 0 } 
      };
      if (!tpl) return container;

      for (let i = group.startRow; i <= group.endRow; i++) {
        const rowData = data[i];
        if (!rowData) continue;
        
        const rowType = classifyRow(rowData);
        if (rowType === 'DATA_ROW' || rowType === 'UNKNOWN') {
          const asset = this.mapRowToTemplate(rowData, tpl, group, i);
          const hasContent = !!asset.description || !!asset.assetIdCode || !!asset.serialNumber || !!asset.chassisNo;
          
          if (hasContent) {
            container.assets.push(asset);
            if (asset.validation.isRejected) {
              container.metrics.invalid++;
            } else {
              container.metrics.valid++;
              if (asset.validation.isUpdate) container.metrics.updates++;
              else container.metrics.new++;
            }
          }
        }
      }
      return container;
    });
  }

  private mapRowToTemplate(row: any[], tpl: HeaderTemplate, group: DiscoveredGroup, rowNum: number): ParsedAsset {
    const asset: any = {
      id: uuidv4(),
      category: group.groupName,
      status: 'UNVERIFIED',
      condition: 'New',
      lastModified: new Date().toISOString(),
      lastModifiedBy: 'Stacked Parser',
      importMetadata: { 
        sourceFile: this.workbookName, 
        sheetName: group.sheetName, 
        rowNumber: rowNum + 1, 
        importedAt: new Date().toISOString() 
      },
      metadata: {},
      validation: { warnings: [], errors: [], duplicateFlags: [], needsReview: false, isRejected: false, isUpdate: false, logs: [] },
      hierarchy: { 
        document: group.sheetName, 
        section: group.groupName, 
        subsection: 'Base Register', 
        assetFamily: 'Uncategorized' 
      }
    };

    tpl.normalizedHeaders.forEach((key, idx) => {
      const val = row[idx];
      if (val === undefined || val === null) return;
      
      const strVal = String(val).trim();
      if (strVal === '') return;

      switch(key) {
        case 'sn': asset.sn = strVal; break;
        case 'asset_description': asset.description = strVal; break;
        case 'asset_id_code': asset.assetIdCode = strVal; break;
        case 'serial_number': asset.serialNumber = strVal; break;
        case 'chassis_no': asset.chassisNo = strVal; break;
        case 'engine_no': asset.engineNo = strVal; break;
        case 'location': asset.location = strVal; break;
        case 'assignee_location': asset.custodian = strVal; break;
        case 'manufacturer': asset.manufacturer = strVal; break;
        case 'model_number': asset.modelNumber = strVal; break;
        case 'purchase_price_ngn': asset.value = parseFloat(strVal.replace(/[^0-9.]/g, '')) || 0; break;
        case 'date_purchased_received': asset.purchaseDate = strVal; break;
        case 'condition': asset.condition = strVal; break;
        case 'remarks': asset.remarks = strVal; break;
        default: 
          const safeKey = (tpl.rawHeaders[idx] || `Column ${idx + 1}`).replace(/[.#$/[\]\n\r]/g, '_').trim();
          asset.metadata[safeKey] = val;
      }
    });

    if (asset.location) {
      const pulse = LocationEngine.normalize(asset.location);
      asset.location = pulse.normalized;
    }

    const existing = this.findExistingAsset(asset);
    if (existing) {
      asset.validation.isUpdate = true;
      asset.validation.existingAssetId = existing.id;
    }

    return asset as ParsedAsset;
  }

  private findExistingAsset(parsed: Partial<Asset>): Asset | undefined {
    if (!this.existingAssets || this.existingAssets.length === 0) return undefined;
    const parsedIdCode = getFuzzySignature(parsed.assetIdCode);
    const parsedSN = getFuzzySignature(parsed.serialNumber);
    return this.existingAssets.find(ex => {
      if (parsedIdCode && parsedIdCode !== 'na' && parsedIdCode === getFuzzySignature(ex.assetIdCode)) return true;
      if (parsedSN && parsedSN !== 'na' && parsedSN === getFuzzySignature(ex.serialNumber)) return true;
      return false;
    });
  }

  private registerTemplate(row: any[], type: HeaderSetType): string {
    const rawHeaders = row.map(c => c === null ? '' : String(c).trim());
    const signature = rawHeaders.map(h => h.toUpperCase()).join('|');
    if (!this.templates.has(signature)) {
      this.templates.set(signature, {
        id: `TPL_${this.templates.size + 1}`,
        rawHeaders,
        normalizedHeaders: rawHeaders.map(normalizeHeaderName),
        columnCount: rawHeaders.length,
        signature,
        type
      });
    }
    return signature;
  }

  private createEmptyContainer(name: string): GroupImportContainer {
    return {
      id: uuidv4(),
      groupName: name,
      headerSet: [],
      headerSource: 'synthetic',
      headerSetType: 'generated_template',
      columnCount: 0,
      rowCount: 0,
      startRow: 0,
      endRow: 0,
      headerStart: null,
      headerEnd: null,
      rawText: name,
      visibleHeaderRow: null,
      templateId: '',
      sheetName: name,
      workbookName: this.workbookName,
      assets: [],
      metrics: { valid: 0, invalid: 0, updates: 0, new: 0 }
    };
  }
}
