/**
 * @fileOverview High-Fidelity NTBLCP Structural Parser Engine.
 * Implements the two-stage structural discovery and ingestion process.
 * Phase 190: Hardened template persistence and inclusive mapping logic.
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

    const summary: ImportRunSummary = {
      workbookName: this.workbookName,
      sheetName,
      profileId: 'STRUCTURAL_ENGINE_V5.1',
      totalRows: data.length,
      groupCount: groups.length,
      dataRowsImported: assets.length,
      rowsRejected: 0,
      duplicatesDetected: assets.filter(a => a.validation.duplicateFlags.length > 0).length,
      templatesDiscovered: this.templates.size,
      sectionBreakdown: this.calculateBreakdown(assets)
    };

    return { assets, summary, groups };
  }

  /**
   * STAGE 1: Scan for all unique column templates in the workbook.
   */
  private discoverTemplates(data: any[][]) {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (classifyRow(row) === 'SCHEMA_HEADER') {
        this.registerTemplate(row);
      }
    }
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

  /**
   * STAGE 2: Import asset rows using discovered templates and group context.
   */
  private executeIngestion(sheetName: string, data: any[][]): { assets: ParsedAsset[], groups: DiscoveredGroup[] } {
    const assets: ParsedAsset[] = [];
    const groups: DiscoveredGroup[] = [];
    
    let activeGroupName: string = 'General Register';
    let activeTemplate: HeaderTemplate | null = null;
    let currentGroup: DiscoveredGroup | null = null;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const classification = classifyRow(row);

      // 1. Group Header (Section boundary)
      if (classification === 'GROUP_HEADER') {
        activeGroupName = String(row[0]).trim();
        // Note: Template persists if next rows match, but we prepare for new anchors
        continue;
      }

      // 2. Explicit Schema Anchor (Found S/N or similar)
      if (classification === 'SCHEMA_HEADER') {
        const rawHeaders = row.map(c => String(c || '').trim()).filter(h => h.length > 0);
        const signature = rawHeaders.map(h => h.toUpperCase()).join('|');
        activeTemplate = this.templates.get(signature) || null;

        if (activeTemplate) {
          currentGroup = {
            groupName: activeGroupName,
            headerSet: activeTemplate.rawHeaders,
            headerSource: 'explicit',
            columnCount: activeTemplate.columnCount,
            templateId: activeTemplate.id,
            startRow: i + 1
          };
          groups.push(currentGroup);
        }
        continue;
      }

      // 3. Data Record Pulse
      if (classification === 'DATA_ROW') {
        if (!activeTemplate) {
          activeTemplate = this.inferTemplate(row);
          if (activeTemplate) {
            currentGroup = {
              groupName: activeGroupName,
              headerSet: activeTemplate.rawHeaders,
              headerSource: 'inferred',
              columnCount: activeTemplate.columnCount,
              templateId: activeTemplate.id,
              startRow: i + 1,
              matchedTemplateSource: activeTemplate.id
            };
            groups.push(currentGroup);
          }
        }

        if (activeTemplate) {
          const asset = this.mapRow(row, activeTemplate, activeGroupName, i + 1, sheetName);
          if (asset) assets.push(asset);
        }
      }
    }

    return { assets, groups };
  }

  private inferTemplate(row: any[]): HeaderTemplate | null {
    if (this.templates.size === 0) return null;

    // Find the last populated index to judge required width
    let lastPopulated = -1;
    row.forEach((c, idx) => {
      if (c !== null && String(c).trim() !== '') lastPopulated = idx;
    });

    let bestMatch: HeaderTemplate | null = null;
    let minDifference = Infinity;

    this.templates.forEach(tpl => {
      // Find template with closest column count that can contain this row's data
      if (tpl.columnCount >= lastPopulated + 1) {
        const diff = tpl.columnCount - (lastPopulated + 1);
        if (diff < minDifference) {
          minDifference = diff;
          bestMatch = tpl;
        }
      }
    });

    // Fallback to most complex template if no perfect fit
    if (!bestMatch) {
      let maxCols = -1;
      this.templates.forEach(tpl => {
        if (tpl.columnCount > maxCols) {
          maxCols = tpl.columnCount;
          bestMatch = tpl;
        }
      });
    }

    return bestMatch;
  }

  private mapRow(row: any[], tpl: HeaderTemplate, group: string, rowNum: number, sheet: string): ParsedAsset | null {
    const asset: any = {
      id: uuidv4(),
      category: group,
      description: '',
      grantId: 'STAGED', 
      section: group,
      subsection: 'Base Register',
      assetFamily: 'Uncategorized',
      status: 'UNVERIFIED',
      condition: 'New',
      lastModified: new Date().toISOString(),
      lastModifiedBy: 'Structural Parser',
      hierarchy: { document: sheet, section: group, subsection: 'Base Register', assetFamily: 'Uncategorized' },
      importMetadata: {
        sourceFile: this.workbookName,
        sheetName: sheet,
        rowNumber: rowNum,
        importedAt: new Date().toISOString()
      },
      metadata: {},
      validation: { warnings: [], errors: [], duplicateFlags: [], needsReview: false, isRejected: false },
      sourceGroup: group,
      templateId: tpl.id
    };

    tpl.normalizedHeaders.forEach((key, idx) => {
      const val = row[idx];
      if (val === undefined || val === null) return;

      const strVal = String(val).trim();
      if (this.isDomainField(key)) {
        asset[key] = strVal;
      } else {
        asset.metadata[tpl.rawHeaders[idx]] = val;
      }
    });

    // Fidelity Check: Ensure row contains meaningful registry data
    if (asset.description || asset.assetIdCode || asset.serialNumber || asset.sn) {
      if (asset.serialNumber && this.existingSerials.has(asset.serialNumber)) {
        asset.validation.duplicateFlags.push('Duplicate Serial Detected');
        asset.validation.needsReview = true;
      }
      return asset as ParsedAsset;
    }

    return null;
  }

  private isDomainField(key: string): boolean {
    const domainFields = [
      'sn', 'description', 'location', 'custodian', 'assetIdCode', 
      'serialNumber', 'manufacturer', 'modelNumber', 'purchaseDate', 
      'value', 'condition', 'remarks'
    ];
    return domainFields.includes(key);
  }

  private calculateBreakdown(assets: ParsedAsset[]): Record<string, number> {
    return assets.reduce((acc, a) => {
      acc[a.section] = (acc[a.section] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
