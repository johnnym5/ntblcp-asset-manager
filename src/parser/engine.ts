/**
 * @fileOverview High-Fidelity NTBLCP Structural Parser Engine.
 * Implements the two-stage structural discovery and ingestion process.
 */

import { v4 as uuidv4 } from 'uuid';
import { classifyRow } from './classifyRow';
import { normalizeHeaderName } from '@/lib/registry-utils';
import type { 
  ParsedAsset, 
  ImportRunSummary, 
  HeaderTemplate,
  DiscoveredGroup
} from './types';
import type { Asset } from '@/types/domain';

export class ParserEngine {
  private templates: Map<string, HeaderTemplate> = new Map();
  private workbookName: string;
  private existingSerials: Set<string>;

  constructor(workbookName: string, existingAssets: Asset[] = []) {
    this.workbookName = workbookName;
    this.existingSerials = new Set(existingAssets.map(a => a.serialNumber).filter(Boolean));
  }

  /**
   * Main Pulse: Two-Stage Discovery & Import
   */
  public parseWorkbook(sheetName: string, data: any[][]): { 
    assets: ParsedAsset[], 
    summary: ImportRunSummary,
    groups: DiscoveredGroup[]
  } {
    // STAGE 1: Discovery Pulse - Learn the Structural Landscape
    this.discoverTemplates(data);

    // STAGE 2: Ingestion Pulse - Map Data to Learned Templates
    const { assets, groups } = this.executeIngestion(sheetName, data);

    const groupCounts: Record<string, number> = {};
    assets.forEach(a => {
      groupCounts[a.section] = (groupCounts[a.section] || 0) + 1;
    });

    const summary: ImportRunSummary = {
      workbookName: this.workbookName,
      sheetName,
      profileId: 'STRUCTURAL_ENGINE_V5',
      totalRows: data.length,
      groupCount: Object.keys(groupCounts).length,
      dataRowsImported: assets.length,
      rowsRejected: 0,
      duplicatesDetected: assets.filter(a => a.validation.duplicateFlags.length > 0).length,
      templatesDiscovered: this.templates.size,
      sectionBreakdown: groupCounts
    };

    return { assets, summary, groups };
  }

  /**
   * STAGE 1: Discover structural groups and their header sets.
   */
  private discoverTemplates(data: any[][]) {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (classifyRow(row) === 'SCHEMA_HEADER') {
        this.registerTemplate(row);
      }
    }
  }

  private registerTemplate(row: any[]): string {
    const rawHeaders = row.map(c => String(c || '').trim()).filter(h => h.length > 0);
    const signature = rawHeaders.join('|');
    
    if (!this.templates.has(signature)) {
      const id = `tpl_${uuidv4().substring(0, 8)}`;
      this.templates.set(signature, {
        id,
        rawHeaders,
        normalizedHeaders: rawHeaders.map(normalizeHeaderName),
        columnCount: row.length,
        signature
      });
      return id;
    }
    return this.templates.get(signature)!.id;
  }

  /**
   * STAGE 2: Import every asset row under its detected group context.
   */
  private executeIngestion(sheetName: string, data: any[][]): { assets: ParsedAsset[], groups: DiscoveredGroup[] } {
    const assets: ParsedAsset[] = [];
    const groups: Map<string, DiscoveredGroup> = new Map();
    let activeGroup: string = 'General Register';
    let activeTemplate: HeaderTemplate | null = null;
    let headerSource: 'explicit' | 'inferred' = 'inferred';

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const classification = classifyRow(row);

      // Context Shift: New Group Header detected in Column A
      if (classification === 'GROUP_HEADER') {
        activeGroup = String(row[0]).trim();
        activeTemplate = null; 
        headerSource = 'inferred';
        continue;
      }

      // Explicit Schema Anchor: S/N row found
      if (classification === 'SCHEMA_HEADER') {
        const sig = row.map(c => String(c || '').trim()).filter(h => h.length > 0).join('|');
        activeTemplate = this.templates.get(sig) || null;
        headerSource = 'explicit';
        
        // Track the structural node for visualization
        if (activeTemplate) {
          groups.set(activeGroup, {
            groupName: activeGroup,
            headerSet: activeTemplate.rawHeaders,
            headerSource: 'explicit',
            columnCount: activeTemplate.columnCount,
            templateId: activeTemplate.id,
            startRow: i + 1
          });
        }
        continue;
      }

      // Record Pulse: Data row detected
      if (classification === 'DATA_ROW') {
        if (!activeTemplate) {
          activeTemplate = this.inferTemplateFromRow(row);
          headerSource = 'inferred';
          
          if (activeTemplate && !groups.has(activeGroup)) {
            groups.set(activeGroup, {
              groupName: activeGroup,
              headerSet: activeTemplate.rawHeaders,
              headerSource: 'inferred',
              columnCount: activeTemplate.columnCount,
              templateId: activeTemplate.id,
              startRow: i + 1
            });
          }
        }

        if (activeTemplate) {
          const asset = this.mapRowToDomain(row, activeTemplate, activeGroup, i + 1, sheetName);
          if (asset) assets.push(asset);
        }
      }
    }

    return { assets, groups: Array.from(groups.values()) };
  }

  private inferTemplateFromRow(row: any[]): HeaderTemplate | null {
    let bestMatch: HeaderTemplate | null = null;
    let maxOverlap = 0;

    this.templates.forEach(tpl => {
      if (tpl.columnCount >= row.length && tpl.columnCount > maxOverlap) {
        bestMatch = tpl;
        maxOverlap = tpl.columnCount;
      }
    });

    return bestMatch;
  }

  private mapRowToDomain(row: any[], tpl: HeaderTemplate, group: string, rowNum: number, sheet: string): ParsedAsset | null {
    const asset: any = {
      id: uuidv4(),
      category: group,
      description: '',
      grantId: 'SYSTEM_STAGED', 
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
        subsection: '', 
        assetFamily: '' 
      },
      importMetadata: {
        sourceFile: this.workbookName,
        sheetName: sheet,
        rowNumber: rowNum,
        importedAt: new Date().toISOString()
      },
      metadata: {},
      validation: { 
        warnings: [], 
        errors: [], 
        duplicateFlags: [], 
        needsReview: false, 
        isRejected: false 
      },
      sourceGroup: group,
      templateId: tpl.id
    };

    tpl.normalizedHeaders.forEach((key, idx) => {
      const val = row[idx];
      if (val !== undefined && val !== null) {
        const strVal = String(val).trim();
        if (this.isDomainField(key)) {
          asset[key] = strVal;
        } else {
          asset.metadata[tpl.rawHeaders[idx] || `COL_${idx}`] = val;
        }
      }
    });

    if (asset.sn && !isNaN(Number(asset.sn))) asset.sn = Number(asset.sn);
    
    if (asset.serialNumber && this.existingSerials.has(asset.serialNumber)) {
      asset.validation.duplicateFlags.push('Duplicate Serial Detected');
      asset.validation.needsReview = true;
    }

    if (asset.description || asset.assetIdCode || asset.serialNumber) {
      return asset as ParsedAsset;
    }

    return null;
  }

  private isDomainField(key: string): boolean {
    const domainFields = [
      'sn', 'description', 'location', 'custodian', 'assetIdCode', 
      'serialNumber', 'manufacturer', 'modelNumber', 'purchaseDate', 
      'value', 'condition', 'remarks', 'grantId', 'category'
    ];
    return domainFields.includes(key);
  }
}
