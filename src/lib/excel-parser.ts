import * as XLSX from 'xlsx';
import type { Asset, AppSettings, SheetDefinition, DisplayField } from './types';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_ALIASES } from './constants';
import { Timestamp } from 'firebase/firestore';
import { ParserEngine } from '@/parser/engine';
import { normalizeHeaderName } from './registry-utils';

/**
 * @fileOverview Excel Ingestion Layer.
 * Updated: Strictly processes only the first sheet of a workbook.
 */

export const sanitizeForFirestore = <T extends object>(obj: T): T => {
    const sanitizedObj: { [key: string]: any } = {};
    for (const key in obj) {
        const value = (obj as any)[key];
        if (key === 'previousState') continue;
        if (value !== undefined) {
            if (value instanceof Date) {
                sanitizedObj[key] = Timestamp.fromDate(value);
            } else {
                sanitizedObj[key] = value;
            }
        }
    }
    return sanitizedObj as T;
};

export interface ScannedSheetInfo {
  sheetName: string;
  rowCount: number;
  groupCount: number;
  headers: string[];
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

        // CRITICAL: Take only the first and only relevant sheet
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
                headers: groups[0].headerSet, // Use first discovered template as preview
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
    existingAssets: Asset[]
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
        
        // CRITICAL: Process only the first sheet
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
  
  // CRITICAL: First sheet only
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
  
  const engine = new ParserEngine(file.name);
  const groups = engine.discoverGroups(sheetName, sheetData);

  if (groups.length > 0) {
      // Return a virtual sheet definition per group
      groups.forEach(group => {
          const displayFields: DisplayField[] = group.headerSet.map(h => {
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
              displayFields,
              groups: [group]
          });
      });
  }

  if (templates.length === 0) {
    throw new Error("Could not find any structural nodes in the primary sheet.");
  }

  return templates;
}
