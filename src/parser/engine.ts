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
   * Scans the sheet to identify structural groups and learn their header sets.
   */
  public discoverGroups(sheetName: string, data: any[][]): DiscoveredGroup[] {
    let activeGroupName = "GENERAL REGISTER";
    let lastHeaderRow: any[] | null = null;
    let groupStartRow = 0;

    this.templates.clear();
    this.discoveredGroups = [];

    data.forEach((row, idx) => {
      const classification = classifyRow(row);

      if (classification === 'GROUP_HEADER') {
        activeGroupName = String(row[0]).trim().toUpperCase();
        groupStartRow = idx;
      }

      if (classification === 'SCHEMA_HEADER') {
        this.registerTemplate(row);
        lastHeaderRow = row;
        
        // Define the group boundary
        const tpl = this.getTemplateBySignature(row);
        if (tpl) {
          this.discoveredGroups.push({
            id: uuidv4(),
            groupName: activeGroupName,
            headerSet: row.filter(h => h !== null).map(String),
            headerSource: 'explicit',
            columnCount: row.length,
            rowCount: 0, // Calculated in Stage 2
            startRow: idx,
            templateId: tpl.id,
            sheetName,
            workbookName: this.workbookName
          });
        }
      }
    });

    // If no groups found, create a fallback group using the sheet name
    if (this.discoveredGroups.length === 0 && data.length > 0) {
      this.inferFallbackGroup(sheetName, data);
    }

    return this.discoveredGroups;
  }

  /**
   * STAGE 2: Full Ingestion.
   * Maps every row to its discovered group template.
   */
  public parseWorkbook(sheetName: string, data: any[][]): ImportRunSummary {
    const groups = this.discoverGroups(sheetName, data);
    const containers: GroupImportContainer[] = [];
    let currentContainer: GroupImportContainer | null = null;

    data.forEach((row, idx) => {
      const classification = classifyRow(row);

      // Switch context if we hit a known group boundary
      const groupMatch = groups.find(g => g.startRow === idx);
      if (groupMatch) {
        currentContainer = {
          ...groupMatch,
          assets: []
        };
        containers.push(currentContainer);
        return; // Skip the header row itself
      }

      if (classification === 'DATA_ROW' && currentContainer) {
        const tpl = Array.from(this.templates.values()).find(t => t.id === currentContainer?.templateId);
        if (tpl) {
          const asset = this.mapRowToTemplate(row, tpl, currentContainer.groupName, idx, sheetName);
          if (asset) currentContainer.assets.push(asset);
        }
      }
    });

    return {
      workbookName: this.workbookName,
      sheetName,
      profileId: 'STRUCTURAL_ENGINE_V5',
      totalRows: data.length,
      groupCount: containers.length,
      dataRowsImported: containers.reduce((sum, c) => sum + c.assets.length, 0),
      rowsRejected: 0,
      duplicatesDetected: 0,
      templatesDiscovered: this.templates.size,
      sectionBreakdown: {},
      groups: containers
    };
  }

  private registerTemplate(row: any[]) {
    const rawHeaders = row.map(c => String(c || '').trim()).filter(h => h.length > 0);
    const signature = rawHeaders.map(h => h.toUpperCase()).join('|');
    
    if (!this.templates.has(signature)) {
      this.templates.set(signature, {
        id: `TPL_${uuidv4().substring(0, 4).toUpperCase()}`,
        rawHeaders,
        normalizedHeaders: rawHeaders.map(normalizeHeaderName),
        columnCount: row.length,
        signature
      });
    }
  }

  private getTemplateBySignature(row: any[]): HeaderTemplate | null {
    const sig = row.map(c => String(c || '').trim().toUpperCase()).join('|');
    return Array.from(this.templates.values()).find(t => t.signature === sig) || null;
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

    // Integrity Guard: Ensure at least a description or ID exists
    if (!asset.description && !asset.assetIdCode && !asset.serialNumber) {
      return null;
    }

    return asset as ParsedAsset;
  }

  private isDomainField(key: string): boolean {
    const domainFields = [
      'sn', 'description', 'location', 'custodian', 'assetIdCode', 
      'serialNumber', 'manufacturer', 'modelNumber', 'purchaseDate', 
      'value', 'condition', 'remarks'
    ];
    return domainFields.includes(key);
  }

  private inferFallbackGroup(sheetName: string, data: any[][]) {
    // Basic implementation for flat sheets
    const firstRow = data[0];
    this.registerTemplate(firstRow);
    const tpl = this.getTemplateBySignature(firstRow);
    if (tpl) {
      this.discoveredGroups.push({
        id: uuidv4(),
        groupName: sheetName.toUpperCase(),
        headerSet: tpl.rawHeaders,
        headerSource: 'inferred',
        columnCount: tpl.columnCount,
        rowCount: data.length - 1,
        startRow: 0,
        templateId: tpl.id,
        sheetName,
        workbookName: this.workbookName
      });
    }
  }
}
