/**
 * @fileOverview High-Fidelity Multi-Profile Parser Engine.
 */

import { v4 as uuidv4 } from 'uuid';
import { TB_PROFILE } from './profiles/tb';
import { C19_PROFILE } from './profiles/c19';
import type { 
  WorkbookProfile, 
  ParserState, 
  RowClassification, 
  ParsedAsset, 
  ImportRunSummary,
  ValidationSummary
} from './types';
import type { Asset } from '@/types/domain';

const PROFILES: WorkbookProfile[] = [TB_PROFILE, C19_PROFILE];

export class ParserEngine {
  private state: ParserState;
  private summary: ImportRunSummary;
  private existingSerials: Set<string>;
  private existingAssetIds: Set<string>;

  constructor(workbookName: string, existingAssets: Asset[] = []) {
    this.state = {
      profile: null,
      sheetName: '',
      docTitle: '',
      sectionPath: {
        documentTitle: '',
        majorSection: 'General',
        subsection: 'Base Register',
        assetFamily: 'Uncategorized'
      },
      activeHeader: null,
      activeHeaderMap: null
    };

    this.summary = {
      workbookName,
      sheetName: '',
      profileId: 'UNKNOWN',
      totalRows: 0,
      titleRows: 0,
      sectionRows: 0,
      headerRows: 0,
      dataRowsImported: 0,
      rowsRejected: 0,
      rowsRequiringReview: 0,
      duplicatesDetected: 0,
      warningsCount: 0,
      errorsCount: 0,
      sectionBreakdown: {}
    };

    this.existingSerials = new Set(existingAssets.map(a => a.serialNumber).filter(Boolean));
    this.existingAssetIds = new Set(existingAssets.map(a => a.assetIdCode).filter(Boolean));
  }

  /**
   * Orchestrates the parsing of a workbook sheet.
   */
  public parseSheet(sheetName: string, data: any[][]): { assets: ParsedAsset[], summary: ImportRunSummary } {
    this.state.sheetName = sheetName;
    this.summary.sheetName = sheetName;
    
    // 1. Detect Profile
    this.state.profile = this.detectProfile(sheetName, data);
    this.summary.profileId = this.state.profile?.id || 'UNKNOWN';

    if (!this.state.profile) {
      console.warn(`Parser: No profile detected for sheet ${sheetName}. Defaulting to C19 logic.`);
      this.state.profile = C19_PROFILE;
    }

    const assets: ParsedAsset[] = [];

    // 2. Iterate Rows
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;
      this.summary.totalRows++;

      const classification = this.classifyRow(row);

      switch (classification) {
        case 'EMPTY':
          continue;

        case 'DOC_TITLE':
          this.summary.titleRows++;
          this.state.sectionPath.documentTitle = String(row.find(c => c) || '');
          break;

        case 'SECTION_TITLE':
          this.summary.sectionRows++;
          this.updateSectionContext(row);
          break;

        case 'SCHEMA_HEADER':
          this.summary.headerRows++;
          this.setActiveHeader(row);
          break;

        case 'DATA_ROW':
          if (this.state.activeHeaderMap) {
            const asset = this.parseDataRow(row, rowNum);
            if (asset) {
              assets.push(asset);
              this.summary.dataRowsImported++;
              
              const section = this.state.sectionPath.majorSection;
              this.summary.sectionBreakdown[section] = (this.summary.sectionBreakdown[section] || 0) + 1;
              
              if (asset.validation.needsReview) this.summary.rowsRequiringReview++;
              if (asset.validation.isRejected) this.summary.rowsRejected++;
              this.summary.duplicatesDetected += asset.validation.duplicateFlags.length;
              this.summary.warningsCount += asset.validation.warnings.length;
              this.summary.errorsCount += asset.validation.errors.length;
            }
          }
          break;

        case 'UNKNOWN':
          // Potential data row but no header, or just noise
          break;
      }
    }

    return { assets, summary: this.summary };
  }

  private detectProfile(sheetName: string, data: any[][]): WorkbookProfile | null {
    // Check sheet names
    const sName = sheetName.toUpperCase();
    for (const p of PROFILES) {
      if (p.sheetNameHints.some(h => sName.includes(h.toUpperCase()))) return p;
    }

    // Check header signatures in first 20 rows
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i].map(c => this.normalize(String(c || '')));
      for (const p of PROFILES) {
        const sig = p.primaryHeaderSignature.map(h => this.normalize(h));
        const matches = row.filter(cell => sig.includes(cell)).length;
        if (matches / sig.length >= 0.6) return p;
      }
    }

    return null;
  }

  private classifyRow(row: any[]): RowClassification {
    if (!row || row.every(c => c === null || String(c).trim() === '')) return 'EMPTY';

    const rowText = row.map(c => String(c || '').trim().toUpperCase()).join(' ');
    const firstCell = String(row.find(c => c) || '').trim().toUpperCase();

    // 1. Doc Title
    if (this.state.profile?.titlePatterns.some(p => rowText.includes(p.toUpperCase()))) return 'DOC_TITLE';

    // 2. Schema Header
    if (this.state.profile) {
      const normalizedRow = row.map(c => this.normalize(String(c || '')));
      const sigs = [this.state.profile.primaryHeaderSignature, ...this.state.profile.secondaryHeaderSignatures];
      
      for (const sig of sigs) {
        const normSig = sig.map(h => this.normalize(h));
        const matches = normalizedRow.filter(cell => normSig.includes(cell)).length;
        if (matches / sig.length >= 0.7) return 'SCHEMA_HEADER';
      }
    }

    // 3. Section Title
    if (this.state.profile?.sectionPatterns.some(p => rowText.includes(p.toUpperCase()))) return 'SECTION_TITLE';

    // 4. Data Row (If we have an active header and row has content)
    if (this.state.activeHeaderMap) {
      const populatedCount = row.filter(c => c !== null && String(c).trim() !== '').length;
      if (populatedCount > 2) return 'DATA_ROW';
    }

    return 'UNKNOWN';
  }

  private updateSectionContext(row: any[]) {
    const label = String(row.find(c => c) || '').trim();
    const upper = label.toUpperCase();

    // Heuristics for depth
    if (upper.includes('ADDITIONAL') || upper.includes('ADDITIONS') || upper.includes('TRANSFERRED')) {
      this.state.sectionPath.subsection = label;
    } else if (upper.includes('PIECES') || upper.includes('BATCH')) {
      this.state.sectionPath.assetFamily = label;
    } else {
      this.state.sectionPath.majorSection = label;
      this.state.sectionPath.subsection = 'Base Register';
      this.state.sectionPath.assetFamily = 'Uncategorized';
    }
  }

  private setActiveHeader(row: any[]) {
    this.state.activeHeader = row.map(c => String(c || '').trim());
    this.state.activeHeaderMap = {};
    
    this.state.activeHeader.forEach((h, i) => {
      if (h) {
        const normalized = this.normalize(h);
        // Map normalized header to canonical field using aliases
        const aliasKey = Object.keys(this.state.profile!.headerAliases).find(k => this.normalize(k) === normalized);
        if (aliasKey) {
          const field = this.state.profile!.headerAliases[aliasKey];
          this.state.activeHeaderMap![field] = i;
        }
        // Store the original index for metadata reconstruction
        this.state.activeHeaderMap![`raw_${i}`] = i;
      }
    });
  }

  private parseDataRow(row: any[], rowNum: number): ParsedAsset | null {
    if (!this.state.activeHeaderMap || !this.state.profile) return null;

    const map = this.state.activeHeaderMap;
    const getValue = (field: string) => {
      const idx = map[field];
      return idx !== undefined ? row[idx] : undefined;
    };

    const description = String(getValue('description') || '').trim();
    const sn = String(getValue('sn') || '').trim();
    const serial = String(getValue('serialNumber') || '').trim();
    const assetId = String(getValue('assetIdCode') || '').trim();

    // Canonical Pulse
    const asset: ParsedAsset = {
      id: uuidv4(),
      description: description || 'Untitled Asset',
      category: this.state.profile.id === 'TB_PROFILE' ? 'TB' : 'C19',
      grantId: this.state.profile.grantKey,
      
      section: this.state.sectionPath.majorSection,
      subsection: this.state.sectionPath.subsection,
      assetFamily: this.state.sectionPath.assetFamily,
      
      location: String(getValue('location') || '').trim(),
      lga: String(getValue('lga') || '').trim(),
      custodian: String(getValue('custodian') || 'Unassigned').trim(),
      
      status: 'UNVERIFIED',
      condition: String(getValue('condition') || 'New').trim(),
      
      serialNumber: serial || sn || 'N/A',
      assetIdCode: assetId || undefined,
      manufacturer: String(getValue('manufacturer') || '').trim(),
      modelNumber: String(getValue('modelNumber') || '').trim(),
      chassisNo: String(getValue('chassisNo') || '').trim(),
      engineNo: String(getValue('engineNo') || '').trim(),
      supplier: String(getValue('supplier') || '').trim(),
      purchaseDate: this.formatDate(getValue('purchaseDate')),
      value: this.parseNumeric(getValue('purchasePriceNgn')),
      valueUsd: this.parseNumeric(getValue('purchasePriceUsd')),
      funder: String(getValue('funder') || '').trim(),
      usefulLife: String(getValue('usefulLife') || '').trim(),
      remarks: String(getValue('remarks') || '').trim(),
      grant: String(getValue('grant') || '').trim(),
      pvJvNo: String(getValue('pvJvNo') || '').trim(),
      imei: String(getValue('imei') || '').trim(),

      hierarchy: { ...this.state.sectionPath, document: this.state.sheetName },
      importMetadata: {
        sourceFile: this.summary.workbookName,
        sheetName: this.state.sheetName,
        rowNumber: rowNum,
        importedAt: new Date().toISOString()
      },
      metadata: {},
      rawRow: [...row],
      rawHeader: [...this.state.activeHeader!],
      
      lastModified: new Date().toISOString(),
      lastModifiedBy: 'System Ingestion',
      validation: {
        warnings: [],
        errors: [],
        duplicateFlags: [],
        needsReview: false,
        isRejected: false
      }
    };

    // TB Specific: Depreciation preservation
    if (this.state.profile.id === 'TB_PROFILE') {
      this.captureDepreciation(asset, row);
    }

    this.validateAsset(asset);

    return asset;
  }

  private captureDepreciation(asset: ParsedAsset, row: any[]) {
    // Columns V:AC (NGN) and AE:AL (USD) are specific to TB Profile
    // We store them in metadata for now or in the depreciation object
    asset.depreciation = { ngn: {}, usd: {} };
    // Implementation details for specific column indices...
  }

  private validateAsset(asset: ParsedAsset) {
    const v = asset.validation;

    if (!asset.description || asset.description === 'Untitled Asset') v.errors.push('Missing Asset Description');
    if (!asset.location) v.warnings.push('Missing Location Scope');
    if (!asset.serialNumber || asset.serialNumber === 'N/A') v.warnings.push('Missing Serial Number');

    // Duplicate Detection
    if (asset.serialNumber && this.existingSerials.has(asset.serialNumber)) {
      v.duplicateFlags.push('Duplicate Serial Pulse');
      v.needsReview = true;
    }
    if (asset.assetIdCode && this.existingAssetIds.has(asset.assetIdCode)) {
      v.duplicateFlags.push('Duplicate Tag ID');
      v.needsReview = true;
    }

    if (v.errors.length > 0) v.isRejected = true;
    if (v.warnings.length > 0 || v.duplicateFlags.length > 0) v.needsReview = true;
  }

  private normalize(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
  }

  private parseNumeric(val: any): number {
    if (typeof val === 'number') return val;
    const s = String(val || '0').replace(/[^\d.-]/g, '');
    return parseFloat(s) || 0;
  }

  private formatDate(val: any): string | undefined {
    if (val instanceof Date) return val.toISOString();
    return val ? String(val) : undefined;
  }
}
