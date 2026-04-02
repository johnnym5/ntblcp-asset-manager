'use client';

/**
 * @fileOverview High-Fidelity NTBLCP Structural Parser Engine.
 * Phase 326: Hardened section name discovery to prioritize labels above headers.
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
   * STAGE 1: Discovery Pulse - Identify all structural groups, names, and counts.
   */
  public discoverGroups(sheetName: string, data: any[][]): DiscoveredGroup[] {
    this.templates.clear();
    this.discoveredGroups = [];
    
    // Pass 1: Learn all unique templates in the sheet
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (classifyRow(row) === 'SCHEMA_HEADER') {
        this.registerTemplate(row);
      }
    }

    // Pass 2: Map boundaries, names, and count rows
    let activeGroupName: string | null = null;
    const sheetNameUpper = sheetName.toUpperCase();
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const classification = classifyRow(row);

      // Capture specific group titles found above headers
      if (classification === 'GROUP_HEADER') {
        const firstPopulated = row.find(c => c !== null && String(c).trim() !== '');
        const potentialLabel = String(firstPopulated).trim().toUpperCase();
        
        // Ignore labels that are just the sheet name or technical noise
        if (potentialLabel !== sheetNameUpper && potentialLabel.length > 2) {
          activeGroupName = potentialLabel;
        }
        continue;
      }

      // When a header row is found, a new group starts
      if (classification === 'SCHEMA_HEADER') {
        const rawHeaders = row.map(c => String(c || '').trim()).filter(h => h.length > 0);
        const signature = rawHeaders.map(h => h.toUpperCase()).join('|');
        const foundTemplate = this.templates.get(signature);

        if (foundTemplate) {
          // Count assets belonging to this specific group pulse
          let rowCount = 0;
          let j = i + 1;
          while (j < data.length) {
            const nextRow = data[j];
            const nextClass = classifyRow(nextRow);
            if (nextClass === 'SCHEMA_HEADER' || nextClass === 'GROUP_HEADER') break;
            if (nextClass === 'DATA_ROW') rowCount++;
            j++;
          }

          // Use active name if found, otherwise use sheet name as last resort
          const finalGroupName = activeGroupName || sheetNameUpper;

          this.discoveredGroups.push({
            id: uuidv4(),
            groupName: finalGroupName,
            headerSet: foundTemplate.rawHeaders,
            headerSource: 'explicit',
            columnCount: foundTemplate.columnCount,
            rowCount,
            templateId: foundTemplate.id,
            startRow: i + 1,
            sheetName,
            workbookName: this.workbookName
          });

          // Reset active name after assigning it to a group, so subsequent headers
          // don't inherit it unless a new label is found.
          activeGroupName = null;
        }
      }
    }

    // Only deduplicate if names are actually identical
    const seenNames = new Map<string, number>();
    this.discoveredGroups = this.discoveredGroups.map(group => {
      const count = seenNames.get(group.groupName) || 0;
      seenNames.set(group.groupName, count + 1);
      return {
        ...group,
        groupName: count > 0 ? `${group.groupName} (PART ${count + 1})` : group.groupName
      };
    });

    return this.discoveredGroups;
  }

  /**
   * STAGE 2: Controlled Ingestion - Import specific groups using positional mapping.
   */
  public ingestGroups(sheetName: string, data: any[][], selectedGroupIds: Set<string>): ImportRunSummary {
    const containers: GroupImportContainer[] = [];
    const allAssets: ParsedAsset[] = [];

    const selectedGroups = this.discoveredGroups.filter(g => selectedGroupIds.has(g.id));

    selectedGroups.forEach((group) => {
      const currentIdxInAll = this.discoveredGroups.findIndex(g => g.id === group.id);
      const nextGroupInWorkbook = this.discoveredGroups[currentIdxInAll + 1];
      const nextBoundaryRow = nextGroupInWorkbook ? nextGroupInWorkbook.startRow : data.length + 1;
      
      const groupData = data.slice(group.startRow, nextBoundaryRow - 1);
      const tpl = Array.from(this.templates.values()).find(t => t.id === group.templateId);
      if (!tpl) return;

      const container: GroupImportContainer = {
        id: group.id,
        groupName: group.groupName,
        templateId: group.templateId,
        workbookName: this.workbookName,
        sheetName,
        headerSet: group.headerSet,
        assets: [],
        metrics: { total: 0, valid: 0, invalid: 0 }
      };

      groupData.forEach((row, rowIdx) => {
        const rowClassification = classifyRow(row);
        if (rowClassification === 'EMPTY' || rowClassification === 'GROUP_HEADER' || rowClassification === 'SCHEMA_HEADER') return;

        container.metrics.total++;
        const asset = this.mapPositionalRow(row, tpl, group.groupName, group.startRow + rowIdx + 1, sheetName);
        
        if (asset) {
          if (asset.validation.isRejected) {
            container.metrics.invalid++;
          } else {
            container.metrics.valid++;
          }
          container.assets.push(asset);
          allAssets.push(asset);
        }
      });

      containers.push(container);
    });

    return {
      workbookName: this.workbookName,
      sheetName,
      profileId: 'CONTROLLED_ENGINE_V1.2',
      totalRows: data.length,
      groupCount: containers.length,
      dataRowsImported: allAssets.length,
      rowsRejected: allAssets.filter(a => a.validation.isRejected).length,
      duplicatesDetected: allAssets.filter(a => a.validation.duplicateFlags.length > 0).length,
      templatesDiscovered: this.templates.size,
      sectionBreakdown: {},
      groups: containers
    };
  }

  private mapPositionalRow(row: any[], tpl: HeaderTemplate, group: string, rowNum: number, sheet: string): ParsedAsset | null {
    const logs: ValidationLog[] = [];
    
    let alignedRow = [...row];
    while (alignedRow.length > 0 && (alignedRow[0] === null || String(alignedRow[0]).trim() === '')) {
      alignedRow.shift();
    }

    if (alignedRow.length === 0) return null;

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
      lastModifiedBy: 'Controlled Parser',
      hierarchy: { document: sheet, section: group, subsection: 'Base Register', assetFamily: 'Uncategorized' },
      importMetadata: {
        sourceFile: this.workbookName,
        sheetName: sheet,
        rowNumber: rowNum,
        importedAt: new Date().toISOString()
      },
      metadata: {},
      validation: { warnings: [], errors: [], duplicateFlags: [], needsReview: false, isRejected: false, logs },
      sourceGroup: group,
      templateId: tpl.id
    };

    tpl.normalizedHeaders.forEach((key, idx) => {
      const val = alignedRow[idx];
      const headerLabel = tpl.rawHeaders[idx];

      if (val === undefined || val === null) {
        if (this.isDomainField(key)) asset[key] = '';
        return;
      }

      const strVal = String(val).trim();
      if (this.isDomainField(key)) {
        asset[key] = strVal;
      } else {
        asset.metadata[headerLabel] = val;
      }
    });

    const hasIdentification = asset.description || asset.assetIdCode || asset.serialNumber || asset.sn;
    if (!hasIdentification) {
      asset.validation.isRejected = true;
      asset.validation.logs.push({
        rowNumber: rowNum,
        type: 'missing_columns',
        message: 'No identifying markers found.',
        rawData: row
      });
    }

    return asset as ParsedAsset;
  }

  private registerTemplate(row: any[]) {
    const rawHeaders = row.map(c => String(c || '').trim()).filter(h => h.length > 0);
    if (rawHeaders.length < 2) return;

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

  private isDomainField(key: string): boolean {
    const domainFields = [
      'sn', 'description', 'location', 'custodian', 'assetIdCode', 
      'serialNumber', 'manufacturer', 'modelNumber', 'purchaseDate', 
      'value', 'condition', 'remarks', 'lga', 'site'
    ];
    return domainFields.includes(key);
  }

  public parseWorkbook(sheetName: string, data: any[][]): { assets: ParsedAsset[], summary: ImportRunSummary, groups: DiscoveredGroup[] } {
    const discovered = this.discoverGroups(sheetName, data);
    const selectedIds = new Set(discovered.map(g => g.id));
    const summary = this.ingestGroups(sheetName, data, selectedIds);
    const assets = summary.groups.flatMap(g => g.assets);
    return { assets, summary, groups: discovered };
  }
}
