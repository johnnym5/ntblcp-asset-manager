'use client';

/**
 * @fileOverview Integrated Structural Parser Engine.
 * Enforces strict Row 1 (Name) / Row 2 (Header) discovery.
 * Integrates Template Matching to prevent unmapped asset imports.
 * Phase 1300: Aligned normalization keys to camelCase for schema compliance.
 * Phase 1301: Implemented Selective Header Skipping.
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
  HeaderSetType
} from './types';
import type { Asset, SheetDefinition } from '@/types/domain';

export class ParserEngine {
  private templates: Map<string, HeaderTemplate> = new Map();
  private workbookName: string;
  private existingAssets: Asset[];
  private sheetDefinitions: Record<string, SheetDefinition>;

  constructor(workbookName: string, existingAssets: Asset[] = [], sheetDefinitions: Record<string, SheetDefinition> = {}) {
    this.workbookName = workbookName;
    this.existingAssets = existingAssets;
    this.sheetDefinitions = sheetDefinitions;
  }

  /**
   * Identifies structural blocks using Row 1 (Name) and Row 2 (Header) pattern.
   */
  public discoverGroups(sheetName: string, data: any[][]): DiscoveredGroup[] {
    if (!data || data.length < 2) return [];

    const discovered: DiscoveredGroup[] = [];
    
    // We strictly look for the Name -> Header -> Data pattern
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const type = classifyRow(row);

      // Rule: If we find a standalone title (Row 1), assume the next row is the Header (Row 2)
      if (type === 'GROUP_HEADER') {
        const groupName = String(row[0] || '').trim();
        const headerRow = data[i + 1];
        
        if (headerRow && classifyRow(headerRow) === 'SCHEMA_HEADER') {
          const signature = this.registerTemplate(headerRow, 'real_template');
          const tpl = this.templates.get(signature)!;
          
          // Check if this group already exists in our Template settings
          const fuzzyName = getFuzzySignature(groupName);
          const isMatched = Object.keys(this.sheetDefinitions).some(k => getFuzzySignature(k) === fuzzyName);

          const group: DiscoveredGroup = {
            id: uuidv4(),
            groupName: groupName,
            headerSet: tpl.rawHeaders,
            headerSource: 'explicit',
            headerSetType: 'real_template',
            columnCount: tpl.columnCount,
            rowCount: 0,
            startRow: i + 2, // Data starts after Header
            endRow: data.length - 1,
            headerStart: i + 1,
            headerEnd: i + 1,
            rawText: groupName,
            visibleHeaderRow: tpl.rawHeaders,
            templateId: tpl.id,
            sheetName: sheetName,
            workbookName: this.workbookName,
            isTemplateMatched: isMatched
          };

          // Find end of this specific group by looking for the next TITLE row or empty row
          for (let j = group.startRow; j < data.length; j++) {
            const nextType = classifyRow(data[j]);
            if (nextType === 'GROUP_HEADER' || nextType === 'EMPTY') {
              group.endRow = j - 1;
              break;
            }
          }

          group.rowCount = data.slice(group.startRow, group.endRow + 1).filter(r => classifyRow(r) === 'DATA_ROW').length;
          
          if (group.rowCount > 0) {
            discovered.push(group);
          }
          
          i = group.endRow; // Skip to end of this group
        }
      }
    }

    return discovered;
  }

  /**
   * Extracts data rows using the matched or generated templates.
   */
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
        if (!rowData || classifyRow(rowData) !== 'DATA_ROW') continue;
        
        const asset = this.mapRowToTemplate(rowData, tpl, group, i);
        container.assets.push(asset);
        
        if (asset.validation.isRejected) {
          container.metrics.invalid++;
        } else {
          container.metrics.valid++;
          if (asset.validation.isUpdate) container.metrics.updates++;
          else container.metrics.new++;
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
      lastModifiedBy: 'Template Ingestion',
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

    const exclusions = new Set(group.excludedHeaders || []);

    tpl.normalizedHeaders.forEach((key, idx) => {
      const rawHeader = tpl.rawHeaders[idx];
      
      // SKIP INGESTION FOR EXCLUDED COLUMNS
      if (exclusions.has(rawHeader)) return;

      const val = row[idx];
      if (val === undefined || val === null) return;
      
      const strVal = String(val).trim();
      if (strVal === '') return;

      switch(key) {
        case 'sn': asset.sn = strVal; break;
        case 'description': asset.description = strVal; break;
        case 'assetIdCode': asset.assetIdCode = strVal; break;
        case 'serialNumber': asset.serialNumber = strVal; break;
        case 'chassisNo': asset.chassisNo = strVal; break;
        case 'engineNo': asset.engineNo = strVal; break;
        case 'location': asset.location = strVal; break;
        case 'custodian': asset.custodian = strVal; break;
        case 'manufacturer': asset.manufacturer = strVal; break;
        case 'modelNumber': asset.modelNumber = strVal; break;
        case 'value': 
          const numericVal = parseFloat(strVal.replace(/[^0-9.]/g, ''));
          asset.value = isNaN(numericVal) ? 0 : numericVal; 
          break;
        case 'purchaseDate': asset.purchaseDate = strVal; break;
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

    return this.existingAssets.find(ex => {
      if (parsedIdCode && parsedIdCode !== 'na' && parsedIdCode === getFuzzySignature(ex.assetIdCode)) return true;
      if (parsedSN && parsedSN !== 'na' && parsedSN === getFuzzySignature(ex.serialNumber)) return true;
      if (parsedChassis && parsedChassis !== 'na' && parsedChassis === getFuzzySignature(ex.chassisNo)) return true;
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
}
