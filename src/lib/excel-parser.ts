import * as XLSX from 'xlsx';
import type { Asset, AppSettings, SheetDefinition } from '@/types/domain';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_ALIASES } from './constants';
import { Timestamp } from 'firebase/firestore';
import { ParserEngine } from '@/parser/engine';
import { normalizeHeaderName } from './registry-utils';
import { sanitizeForFirestore } from './utils';

/**
 * @fileOverview Excel Ingestion Layer.
 * Hardened for deployment: unified domain models and positional group mapping.
 * Optimized: Uses centralized sanitization utility.
 */

export { sanitizeForFirestore };

export interface ScannedSheetInfo {
  sheetName: string;
  rowCount: number;
  groupCount: number;
  headers: string[];
  definitionName?: string;
}

/**
 * Scans the first sheet of an Excel file for structural groups.
 */
export async function scanExcelFile(
  fileOrBuffer: File | ArrayBuffer,
  appSettings: AppSettings,
): Promise<{ scannedSheets: ScannedSheetInfo[], errors: string[] }> {
    const scannedSheets: ScannedSheetInfo[] = [];
    const errors: string[] = [];

    try {
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("The workbook contains no sheets.");

        const sheet = workbook.Sheets[sheetName];
        const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
        
        const engine = new ParserEngine(fileOrBuffer instanceof File ? fileOrBuffer.name : 'Unknown');
        const groups = engine.discoverGroups(sheetName, sheetData);

        if (groups.length > 0) {
            scannedSheets.push({
                sheetName: sheetName,
                rowCount: sheetData.length,
                groupCount: groups.length,
                headers: groups[0].headerSet,
            });
        } else {
            errors.push("No structural group blocks discovered in the primary sheet.");
        }

    } catch (e) {
        console.error("Error scanning Excel pulse:", e);
        errors.push(e instanceof Error ? e.message : "An unknown error occurred during scanning.");
    }

    return { scannedSheets, errors };
}

/**
 * Parses the first sheet into group-aware domain assets.
 */
export async function parseExcelFile(
    fileOrBuffer: File | ArrayBuffer, 
    sheetDefinitions: Record<string, SheetDefinition>, 
    existingAssets: Asset[],
    scannedSheets?: any[]
): Promise<{ assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] }> {
    const result: { assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] } = {
        assets: [],
        updatedAssets: [],
        skipped: 0,
        errors: [],
    };
    
    try {
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const fileName = fileOrBuffer instanceof File ? fileOrBuffer.name : 'Ingested Workbook';
        
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
        
        const engine = new ParserEngine(fileName, existingAssets);
        const groups = engine.discoverGroups(sheetName, data);
        
        if (groups.length > 0) {
            const containers = engine.ingestGroups(sheetName, data, groups);
            const sheetAssets = containers.flatMap(c => c.assets);
            result.assets = sheetAssets as unknown as Asset[];
        } else {
            result.errors.push("No structural boundaries detected in the sheet.");
        }

    } catch (e) {
        console.error("Error parsing Excel pulse:", e);
        result.errors.push(e instanceof Error ? e.message : "Deterministic parsing failed.");
    }
    
    return result;
}

/**
 * Scans for templates only, used in the Registry Orchestrator.
 */
export async function parseExcelForTemplate(file: File): Promise<SheetDefinition[]> {
  const templates: SheetDefinition[] = [];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
  
  const engine = new ParserEngine(file.name);
  const groups = engine.discoverGroups(sheetName, sheetData);

  if (groups.length > 0) {
      groups.forEach(group => {
          const displayFields = group.headerSet.map(h => {
              const key = normalizeHeaderName(h);
              return {
                  key: key as keyof Asset,
                  label: h,
                  table: ['sn', 'description', 'location', 'assetIdCode'].includes(key),
                  quickView: true
              };
          });

          templates.push({
              name: group.groupName,
              headers: group.headerSet,
              displayFields
          });
      });
  }

  if (templates.length === 0) {
    throw new Error("Could not find any structural nodes in the primary sheet.");
  }

  return templates;
}
