/**
 * @fileOverview High-Fidelity NTBLCP Structural Parser.
 * Implementation of two-stage group detection and template matching.
 */

import { v4 as uuidv4 } from 'uuid';
import { classifyRow } from './classifyRow';
import { normalizeHeaderName } from '@/lib/registry-utils';
import type { 
  ParsedAsset, 
  ImportRunSummary, 
  HeaderTemplate, 
  GroupBlock,
  ParserState 
} from './types';
import type { Asset } from '@/types/domain';

export class ParserEngine {
  private templates: Map<string, HeaderTemplate> = new Map();
  private groups: GroupBlock[] = [];
  private workbookName: string;
  private existingSerials: Set<string>;

  constructor(workbookName: string, existingAssets: Asset[] = []) {
    this.workbookName = workbookName;
    this.existingSerials = new Set(existingAssets.map(a => a.serialNumber).filter(Boolean));
  }

  /**
   * PRIMARY ENTRY POINT: Two-Stage Parsing
   */
  public parseWorkbook(sheetName: string, data: any[][]): { assets: ParsedAsset[], summary: ImportRunSummary } {
    // Stage 1: Detect Groups & Templates
    this.detectStructure(sheetName, data);

    // Stage 2: Full Import using discovered structure
    const assets = this.executeImport(sheetName, data);

    const summary: ImportRunSummary = {
      workbookName: this.workbookName,
      sheetName,
      profileId: 'STRUCTURAL_V1',
      totalRows: data.length,
      groupCount: this.groups.length,
      dataRowsImported: assets.length,
      rowsRejected: 0,
      duplicatesDetected: assets.filter(a => a.validation.duplicateFlags.length > 0).length,
      templatesDiscovered: this.templates.size,
      sectionBreakdown: this.groups.reduce((acc, g) => ({ ...acc, [g.groupHeader]: g.assets.length }), {})
    };

    return { assets, summary };
  }

  /**
   * STAGE 1: Scan first column, detect groups and header sets.
   */
  private detectStructure(sheetName: string, data: any[][]) {
    let currentGroup: string = 'INITIAL';
    let currentStartRow = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const classification = classifyRow(row);

      if (classification === 'GROUP_HEADER') {
        currentGroup = String(row[0]).trim();
        currentStartRow = i;
        
        // Peek at next row for S/N header
        const nextRow = data[i + 1];
        if (nextRow && classifyRow(nextRow) === 'SCHEMA_HEADER') {
          this.registerTemplate(nextRow);
        }
      } else if (classification === 'SCHEMA_HEADER') {
        this.registerTemplate(row);
      }
    }
  }

  private registerTemplate(row: any[]): string {
    const rawHeaders = row.map(c => String(c || '').trim());
    const signature = rawHeaders.join('|');
    
    if (!this.templates.has(signature)) {
      const id = `tpl_${uuidv4().substring(0, 8)}`;
      this.templates.set(signature, {
        id,
        rawHeaders,
        normalizedHeaders: rawHeaders.map(normalizeHeaderName),
        columnCount: rawHeaders.length,
        signature
      });
      return id;
    }
    return this.templates.get(signature)!.id;
  }

  /**
   * STAGE 2: Import assets using the saved templates.
   */
  private executeImport(sheetName: string, data: any[][]): ParsedAsset[] {
    const assets: ParsedAsset[] = [];
    let activeGroup: string = 'General Registry';
    let activeTemplate: HeaderTemplate | null = null;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const classification = classifyRow(row);

      if (classification === 'GROUP_HEADER') {
        activeGroup = String(row[0]).trim();
        // Reset template for new group, will be assigned by next SCHEMA_HEADER or inference
        activeTemplate = null; 
        continue;
      }

      if (classification === 'SCHEMA_HEADER') {
        const sig = row.map(c => String(c || '').trim()).join('|');
        activeTemplate = this.templates.get(sig) || null;
        continue;
      }

      if (classification === 'DATA_ROW') {
        // If no active template, infer from row shape
        if (!activeTemplate) {
          activeTemplate = this.inferTemplate(row);
        }

        if (activeTemplate) {
          const asset = this.mapRowToAsset(row, activeTemplate, activeGroup, i + 1, sheetName);
          if (asset) assets.push(asset);
        }
      }
    }

    return assets;
  }

  private inferTemplate(row: any[]): HeaderTemplate | null {
    // Match by column count and basic density
    let bestMatch: HeaderTemplate | null = null;
    let maxOverlap = 0;

    this.templates.forEach(tpl => {
      if (tpl.columnCount >= row.length) {
        bestMatch = tpl;
      }
    });

    return bestMatch;
  }

  private mapRowToAsset(row: any[], tpl: HeaderTemplate, group: string, rowNum: number, sheet: string): ParsedAsset | null {
    const asset: any = {
      id: uuidv4(),
      category: 'AUTO_DETECT',
      description: '',
      grantId: 'SYSTEM',
      section: group,
      subsection: 'Base Register',
      assetFamily: 'Uncategorized',
      status: 'UNVERIFIED',
      condition: 'New',
      lastModified: new Date().toISOString(),
      lastModifiedBy: 'Parser Engine',
      hierarchy: { document: sheet, section: group, subsection: '', assetFamily: '' },
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
      if (val !== undefined && val !== null) {
        const strVal = String(val).trim();
        if (key && !key.startsWith('_')) {
          asset[key] = strVal;
        } else {
          asset.metadata[tpl.rawHeaders[idx]] = val;
        }
      }
    });

    // Basic cleaning
    if (asset.sn && !isNaN(Number(asset.sn))) asset.sn = Number(asset.sn);
    
    // Duplicate Check
    if (asset.serialNumber && this.existingSerials.has(asset.serialNumber)) {
      asset.validation.duplicateFlags.push('Duplicate Serial Pulse');
      asset.validation.needsReview = true;
    }

    return asset as ParsedAsset;
  }
}
