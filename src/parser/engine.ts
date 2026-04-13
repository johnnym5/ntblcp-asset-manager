'use client';

/**
 * @fileOverview Multi-Sheet Structural Parser Engine.
 * Reverted to "One Sheet = One Folder" paradigm with independent header discovery.
 * Phase 1100: Implemented parseWorkbook for full-file traversal.
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
    // 1. Discover the primary group for this sheet
    const groups = this.discoverGroups(sheetName, data);
    
    // 2. Ingest the data into a container
    const containers = this.ingestGroups(sheetName, data, groups);
    
    // Return the primary container for this sheet
    return containers[0] || {
      id: uuidv4(),
      groupName: sheetName,
      headerSet: [],
      headerSource: 'synthetic',
      headerSetType: 'generated_template',
      columnCount: 0,
      rowCount: 0,
      startRow: 0,
      endRow: 0,
      headerStart: null,
      headerEnd: null,
      rawText: sheetName,
      visibleHeaderRow: null,
      templateId: '',
      sheetName,
      workbookName: this.workbookName,
      assets: [],
      metrics: { valid: 0, invalid: 0, updates: 0, new: 0 }
    };
  }

  public discoverGroups(sheetName: string, data: any[][]): DiscoveredGroup[] {
    const discovered: DiscoveredGroup[] = [];
    let activeGroup: DiscoveredGroup | null = null;
    
    if (!data || data.length === 0) return [];

    // Find the first header row in the sheet
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(data.length, 20); i++) {
      if (classifyRow(data[i]) === 'SCHEMA_HEADER') {
        headerRowIndex = i;
        break;
      }
    }

    // If no header found, assume row 0 is a synthetic header or needs review
    const effectiveHeaderIndex = headerRowIndex === -1 ? 0 : headerRowIndex;
    const headerRow = data[effectiveHeaderIndex];
    
    const signature = this.registerTemplate(headerRow, headerRowIndex === -1 ? 'inferred_template' : 'real_template');
    const tpl = this.templates.get(signature)!;
    
    activeGroup = this.createNewGroup(sheetName, tpl, headerRowIndex === -1 ? 'inferred' : 'explicit', effectiveHeaderIndex, sheetName);
    activeGroup.startRow = effectiveHeaderIndex + 1;
    activeGroup.endRow = data.length - 1;
    
    // Calculate actual data rows
    activeGroup.rowCount = data.slice(activeGroup.startRow).filter(r => {
      const type = classifyRow(r);
      return type === 'DATA_ROW';
    }).length;

    discovered.push(activeGroup);
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
          
          // Check for minimal data presence to prevent empty row ghosting
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
      lastModifiedBy: 'Multi-Sheet Parser',
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
    const parsedChassis = getFuzzySignature(parsed.chassisNo);
    const parsedDesc = getFuzzySignature(parsed.description);

    return this.existingAssets.find(ex => {
      if (parsedIdCode && parsedIdCode !== 'na' && parsedIdCode === getFuzzySignature(ex.assetIdCode)) return true;
      if (parsedChassis && parsedChassis !== 'na' && parsedChassis === getFuzzySignature(ex.chassisNo)) return true;
      if (parsedSN && parsedSN !== 'na' && parsedSN === getFuzzySignature(ex.serialNumber)) return true;
      if (parsedDesc && parsedDesc === getFuzzySignature(ex.description)) return true;
      return false;
    });
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
      visibleHeaderRow: tpl.rawHeaders,
      templateId: tpl.id,
      sheetName: sheet,
      workbookName: this.workbookName
    };
  }

  private registerTemplate(row: any[], type: HeaderSetType): string {
    const rawHeaders = row.filter(c => c !== null).map(c => String(c).trim());
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

  private matchOrGenerateTemplate(row: any[]): HeaderTemplate {
    for (const tpl of this.templates.values()) {
      if (Math.abs(tpl.columnCount - row.length) <= 1) return tpl;
    }

    const signature = `SYNTH_${row.length}`;
    if (!this.templates.has(signature)) {
      const headers = this.getSyntheticHeaders(row.length);
      this.templates.set(signature, {
        id: `SYNTH_${this.templates.size + 1}`,
        rawHeaders: headers,
        normalizedHeaders: headers.map(normalizeHeaderName),
        columnCount: row.length,
        signature,
        type: 'inferred_template'
      });
    }
    return this.templates.get(signature)!;
  }

  private getSyntheticHeaders(count: number): string[] {
    const canonical = ['S/N', 'Location', 'Assignee (Location)', 'Asset Description', 'Asset ID Code', 'Asset Class', 'Manufacturer', 'Model Number', 'Serial Number', 'Suppliers', 'Date Received', 'Purchase price (Naira)'];
    return Array.from({ length: count }, (_, i) => i < canonical.length ? canonical[i] : `Column ${i + 1}`);
  }
}
