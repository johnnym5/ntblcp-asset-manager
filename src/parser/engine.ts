'use client';

/**
 * @fileOverview High-Fidelity NTBLCP Structural Parser Engine.
 * Implements two-stage template discovery and positional mapping.
 */

import { v4 as uuidv4 } from 'uuid';
import { classifyRow } from './classifyRow';
import { normalizeHeaderName } from '@/lib/registry-utils';
import type { 
  ParsedAsset, 
  ImportRunSummary, 
  HeaderTemplate,
  DiscoveredGroup,
  GroupImportContainer,
  ValidationLog
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
    let activeGroupName = sheetName.toUpperCase();
    let groupStartRow = 0;
    
    this.templates.clear();
    this.discoveredGroups = [];

    data.forEach((row, idx) => {
      const classification = classifyRow(row);

      if (classification === 'GROUP_HEADER') {
        const label = String(row[0]).trim().toUpperCase();
        // Ignore labels that match the sheet name to avoid "TB (PART 1)" noise
        if (label !== sheetName.toUpperCase()) {
          activeGroupName = label;
          groupStartRow = idx;
        }
      }

      if (classification === 'SCHEMA_HEADER') {
        const signature = this.registerTemplate(row);
        const tpl = this.templates.get(signature);
        
        if (tpl) {
          // Count rows until next boundary or end of sheet
          let assetCount = 0;
          for (let i = idx + 1; i < data.length; i++) {
            const nextClass = classifyRow(data[i]);
            if (nextClass === 'GROUP_HEADER' || nextClass === 'SCHEMA_HEADER') break;
            if (nextClass === 'DATA_ROW') assetCount++;
          }

          // Check for duplicate group names in the same sheet
          let finalName = activeGroupName;
          const existingCount = this.discoveredGroups.filter(g => g.groupName.startsWith(activeGroupName)).length;
          if (existingCount > 0) {
            finalName = `${activeGroupName} (PART ${existingCount + 1})`;
          }

          this.discoveredGroups.push({
            id: uuidv4(),
            groupName: finalName,
            headerSet: tpl.rawHeaders,
            headerSource: 'explicit',
            columnCount: tpl.columnCount,
            rowCount: assetCount,
            startRow: idx,
            templateId: tpl.id,
            sheetName,
            workbookName: this.workbookName
          });
        }
      }
    });

    // Fallback if no schema headers found (flat sheet)
    if (this.discoveredGroups.length === 0 && data.length > 0) {
      this.inferFallbackGroup(sheetName, data);
    }

    return this.discoveredGroups;
  }

  /**
   * STAGE 2: Targeted Ingestion.
   * Processes only the selected groups using their specific positional templates.
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

      // Determine the stop row based on the next DISCOVERED group (not just selected)
      const nextGroup = this.discoveredGroups.find(dg => dg.startRow > group.startRow);
      const endRow = nextGroup ? nextGroup.startRow : data.length;

      // Process rows within this group's boundaries
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
    // POSITIONAL MAPPING: We must keep all cells until the last populated one
    const lastPopulatedIndex = row.reduce((max, cell, idx) => (cell !== null && String(cell).trim() !== '') ? idx : max, 0);
    const rawHeaders = row.slice(0, lastPopulatedIndex + 1).map(c => String(c || '').trim());
    
    const signature = rawHeaders.map(h => h.toUpperCase()).join('|');
    
    if (!this.templates.has(signature)) {
      this.templates.set(signature, {
        id: `TPL_${this.templates.size + 1}`,
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

    // Attempt alignment: if row starts empty but data is shifted
    let activeRow = [...row];
    if (activeRow[0] === null || activeRow[0] === '') {
      const firstDataIdx = activeRow.findIndex(c => c !== null && String(c).trim() !== '');
      if (firstDataIdx > 0) activeRow = activeRow.slice(firstDataIdx);
    }

    // Positional Mapping Loop
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

    // Integrity Guard
    if (!asset.description && !asset.assetIdCode && !asset.serialNumber) {
      return null;
    }

    return asset as ParsedAsset;
  }

  private isDomainField(key: string): boolean {
    const domainFields = [
      'sn', 'description', 'location', 'custodian', 'assetIdCode', 
      'serialNumber', 'manufacturer', 'modelNumber', 'purchaseDate', 
      'value', 'condition', 'remarks', 'lga', 'site'
    ];
    return domainFields.includes(key);
  }

  private inferFallbackGroup(sheetName: string, data: any[][]) {
    const firstRow = data.find(r => classifyRow(r) === 'SCHEMA_HEADER');
    if (firstRow) {
      const signature = this.registerTemplate(firstRow);
      const tpl = this.templates.get(signature);
      if (tpl) {
        this.discoveredGroups.push({
          id: uuidv4(),
          groupName: sheetName.toUpperCase(),
          headerSet: tpl.rawHeaders,
          headerSource: 'inferred',
          columnCount: tpl.columnCount,
          rowCount: data.length, 
          startRow: data.indexOf(firstRow),
          templateId: tpl.id,
          sheetName,
          workbookName: this.workbookName
        });
      }
    }
  }
}
