'use client';

/**
 * @fileOverview High-Fidelity NTBLCP Structural Parser Engine.
 * Implements two-stage template discovery and positional mapping.
 * Phase 360: Hardened group discovery pulse for single-sheet registries.
 */

import { v4 as uuidv4 } from 'uuid';
import { classifyRow } from './classifyRow';
import { normalizeHeaderName } from '@/lib/registry-utils';
import type { 
  ParsedAsset, 
  ImportRunSummary, 
  HeaderTemplate,
  DiscoveredGroup,
  GroupImportContainer
} from './types';
import type { Asset } from '@/types/domain';

export class ParserEngine {
  private templates: Map<string, HeaderTemplate> = new Map();
  private discoveredGroups: DiscoveredGroup[] = [];
  private workbookName: string;
  private existingSerials: Set<string>;

  constructor(workbookName: string, existingAssets: Asset[] = []) {
    this.workbookName = workbookName;
    this.existingSerials = new Set(existingAssets.map(a => a.serialNumber).filter(Boolean));
  }

  /**
   * STAGE 1: Template Discovery Pulse.
   * Traverses the sheet to identify structural boundaries and learn unique header sets.
   */
  public discoverGroups(sheetName: string, data: any[][]): DiscoveredGroup[] {
    let pendingGroupName = "GENERAL REGISTER";
    this.templates.clear();
    this.discoveredGroups = [];

    data.forEach((row, idx) => {
      const classification = classifyRow(row);

      // Capture potential group names as we traverse
      if (classification === 'GROUP_HEADER') {
        const label = String(row[0]).trim();
        // Ignore labels that match the sheet name unless it's the only info
        if (label.toUpperCase() !== sheetName.toUpperCase()) {
          pendingGroupName = label;
        }
      }

      // When an S/N row is found, a new group starts
      if (classification === 'SCHEMA_HEADER') {
        const signature = this.registerTemplate(row);
        const tpl = this.templates.get(signature);
        
        if (tpl) {
          // Count rows until next boundary
          let assetCount = 0;
          for (let i = idx + 1; i < data.length; i++) {
            const nextClass = classifyRow(data[i]);
            if (nextClass === 'GROUP_HEADER' || nextClass === 'SCHEMA_HEADER') break;
            if (nextClass === 'DATA_ROW') assetCount++;
          }

          // Use the pending name and immediately clear it to prevent reuse
          const groupName = pendingGroupName;
          
          this.discoveredGroups.push({
            id: uuidv4(),
            groupName: groupName,
            headerSet: tpl.rawHeaders,
            headerSource: 'explicit',
            columnCount: tpl.columnCount,
            rowCount: assetCount,
            startRow: idx,
            templateId: tpl.id,
            sheetName,
            workbookName: this.workbookName
          });

          // Reset pending name to default for next block unless a new header is found
          pendingGroupName = "UNLABELED SECTION";
        }
      }
    });

    return this.discoveredGroups;
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
        assets: []
      };

      // Determine the stop row based on the next DISCOVERED group
      const nextDiscoveredGroup = this.discoveredGroups.find(dg => dg.startRow > group.startRow);
      const endRow = nextDiscoveredGroup ? nextDiscoveredGroup.startRow : data.length;

      for (let i = group.startRow + 1; i < endRow; i++) {
        const row = data[i];
        if (classifyRow(row) === 'DATA_ROW') {
          const asset = this.mapRowToTemplate(row, tpl, group.groupName, i, sheetName);
          if (asset) container.assets.push(asset);
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

    let activeRow = [...row];
    if (activeRow[0] === null || activeRow[0] === '') {
      const firstDataIdx = activeRow.findIndex(c => c !== null && String(c).trim() !== '');
      if (firstDataIdx > 0) activeRow = activeRow.slice(firstDataIdx);
    }

    tpl.normalizedHeaders.forEach((key, idx) => {
      const val = activeRow[idx];
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
      'value', 'condition', 'remarks', 'lga', 'site'
    ].includes(key);
  }
}
