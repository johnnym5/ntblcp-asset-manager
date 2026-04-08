'use client';

/**
 * @fileOverview High-Fidelity NTBLCP Structural Parser Engine.
 * Implements two-stage structural discovery and group-aware mapping.
 * Phase 1002: Deployment Stability Pulse. Hardened metadata key sanitization.
 * Phase 1003: Integrated Centralized Naming Normalization Pulse.
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

  public discoverGroups(sheetName: string, data: any[][]): DiscoveredGroup[] {
    const discovered: DiscoveredGroup[] = [];
    let pendingGroupLabel: string | null = null;
    let activeGroup: DiscoveredGroup | null = null;
    
    if (!data || data.length === 0) return [];

    data.forEach((row, idx) => {
      const type = classifyRow(row);
      if (type === 'GROUP_HEADER') {
        if (activeGroup) activeGroup.endRow = idx - 1;
        pendingGroupLabel = String(row[0] || '').trim();
      }
      if (type === 'SCHEMA_HEADER') {
        const signature = this.registerTemplate(row, 'real_template');
        const tpl = this.templates.get(signature)!;
        activeGroup = this.createNewGroup(pendingGroupLabel || "GENERAL", tpl, 'explicit', idx, sheetName);
        discovered.push(activeGroup);
        pendingGroupLabel = null; 
      }
      if (type === 'DATA_ROW' && pendingGroupLabel) {
        const matchedTpl = this.matchOrGenerateTemplate(row);
        activeGroup = this.createNewGroup(pendingGroupLabel, matchedTpl, 'inferred', idx, sheetName);
        discovered.push(activeGroup);
        pendingGroupLabel = null;
      }
    });

    discovered.forEach((group, idx) => {
      const nextGroup = discovered[idx + 1];
      const stopRow = nextGroup ? nextGroup.startRow : data.length;
      group.rowCount = data.slice(group.startRow, stopRow).filter(r => classifyRow(r) === 'DATA_ROW').length;
      group.endRow = stopRow - 1;
    });

    return discovered;
  }

  public ingestGroups(sheetName: string, data: any[][], selectedGroups: DiscoveredGroup[]): GroupImportContainer[] {
    return selectedGroups.map(group => {
      const tpl = Array.from(this.templates.values()).find(t => t.id === group.templateId);
      const container: GroupImportContainer = { ...group, assets: [], metrics: { valid: 0, invalid: 0 } };
      if (!tpl) return container;

      for (let i = group.startRow; i <= group.endRow; i++) {
        const rowData = data[i];
        if (!rowData) continue;
        
        const rowType = classifyRow(rowData);
        if (rowType === 'DATA_ROW') {
          const asset = this.mapRowToTemplate(rowData, tpl, group, i);
          container.assets.push(asset);
          if (asset.validation.isRejected) {
            container.metrics.invalid++;
          } else {
            container.metrics.valid++;
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
      lastModifiedBy: 'Structural Parser',
      importMetadata: { 
        sourceFile: this.workbookName, 
        sheetName: group.sheetName, 
        rowNumber: rowNum + 1, 
        importedAt: new Date().toISOString() 
      },
      metadata: {},
      validation: { warnings: [], errors: [], duplicateFlags: [], needsReview: false, isRejected: false, logs: [] },
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
        case 'location': asset.location = strVal; break;
        case 'assignee_location': asset.custodian = strVal; break;
        case 'manufacturer': asset.manufacturer = strVal; break;
        case 'model_number': asset.modelNumber = strVal; break;
        default: 
          const safeKey = (tpl.rawHeaders[idx] || `Column ${idx + 1}`).replace(/[.#$/[\]\n\r]/g, '_').trim();
          asset.metadata[safeKey] = val;
      }
    });

    // Integrated Deterministic Normalization
    if (asset.location) {
      const pulse = LocationEngine.normalize(asset.location);
      asset.location = pulse.normalized;
      asset.normalizedState = pulse.state;
      asset.normalizedZone = pulse.zone;
      asset.locationConfidence = pulse.confidence;
      asset.locationStatus = pulse.status;
    }

    if (asset.custodian) {
      // Normalize Assignee: Title Case + Fuzzy Signature check
      asset.custodian = asset.custodian.trim().replace(/\b\w/g, (l: string) => l.toUpperCase());
    }

    const hasIdentification = !!asset.description || !!asset.assetIdCode || !!asset.serialNumber;

    if (!hasIdentification) {
      asset.validation.isRejected = true;
      asset.validation.logs.push({
        rowNumber: rowNum + 1,
        type: 'empty_row',
        message: 'Identification pulse missing (No Description, Tag ID, or Serial discovered).',
        rawData: row
      });
    }

    return asset as ParsedAsset;
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
      if (Math.abs(tpl.columnCount - row.length) <= 2) return tpl;
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
