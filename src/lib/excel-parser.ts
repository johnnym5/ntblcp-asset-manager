import * as XLSX from 'xlsx';
import type { Asset, AppSettings, SheetDefinition, DisplayField } from './types';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_ALIASES, IHVN_SUB_SHEET_DEFINITIONS } from './constants';
import { Timestamp } from 'firebase/firestore';
import { ParserEngine } from '@/parser/engine';
import { normalizeHeaderName } from './registry-utils';

const normalizeHeader = (header: any): string => {
    if (header === null || header === undefined) return '';
    return String(header).trim().toUpperCase().replace(/\s+/g, ' ');
};

const findHeaderRowIndex = (sheetData: any[][], definitiveHeaders: string[], startRow: number = 0): number => {
    const normalizedDefinitiveHeaders = definitiveHeaders.map(normalizeHeader);
    
    for (let i = startRow; i < Math.min(sheetData.length, startRow + 25); i++) { // Search deeper
        const row = sheetData[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedDefinitiveHeaders.filter(h => normalizedRow.includes(h)).length;
        
        if (matchCount / normalizedDefinitiveHeaders.length >= 0.7) {
            return i;
        }
    }
    return -1;
};

const COLUMN_TO_ASSET_FIELD_MAP = new Map<string, keyof Asset>();
for (const key in HEADER_ALIASES) {
    const assetKey = key as keyof Asset;
    const aliases = HEADER_ALIASES[assetKey];
    if (aliases) {
        for (const alias of aliases) {
            COLUMN_TO_ASSET_FIELD_MAP.set(normalizeHeader(alias), assetKey);
        }
    }
}

export const sanitizeForFirestore = <T extends object>(obj: T): T => {
    const sanitizedObj: { [key: string]: any } = {};
    for (const key in obj) {
        const value = (obj as any)[key];
        if (key === 'previousState') {
            continue; 
        }
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
  definitionName: string;
  rowCount: number;
  headers: string[];
}

export async function scanExcelFile(
  fileOrBuffer: File | ArrayBuffer,
  appSettings: AppSettings,
): Promise<{ scannedSheets: ScannedSheetInfo[], errors: string[] }> {
    const { sheetDefinitions } = appSettings;
    const scannedSheets: ScannedSheetInfo[] = [];
    const errors: string[] = [];

    try {
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            
            for (const defName in sheetDefinitions) {
                const definition = sheetDefinitions[defName];
                const headerRowIndex = findHeaderRowIndex(sheetData, definition.headers);

                if (headerRowIndex !== -1) {
                    const dataRows = sheetData.slice(headerRowIndex + 1);
                    const rowCount = dataRows.filter(row => Array.isArray(row) && row.some(cell => cell !== null && String(cell).trim() !== '')).length;
                    const headers = sheetData[headerRowIndex].filter(h => h !== null).map(String);
                    
                    scannedSheets.push({
                        sheetName: sheetName,
                        definitionName: defName,
                        rowCount: rowCount,
                        headers: headers,
                    });
                    
                    break; 
                }
            }
        }
        if (scannedSheets.length === 0) {
            errors.push("No matching asset sheets were found in this workbook based on the current settings.");
        }

    } catch (e) {
        console.error("Error scanning Excel file:", e);
        errors.push(e instanceof Error ? e.message : "An unknown error occurred during scanning.");
    }

    return { scannedSheets, errors };
}

export async function parseExcelFile(
    fileOrBuffer: File | ArrayBuffer, 
    sheetDefinitions: Record<string, SheetDefinition>, 
    existingAssets: Asset[],
    sheetsToImport?: ScannedSheetInfo[]
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
        
        const engine = new ParserEngine(fileName, existingAssets);

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
            
            // If targeted import info is provided, use it
            const importInfo = sheetsToImport?.find(s => s.sheetName === sheetName);
            const groups = engine.discoverGroups(sheetName, data);
            
            if (groups.length > 0) {
                const containers = engine.ingestGroups(sheetName, data, groups);
                const sheetAssets = containers.flatMap(c => c.assets);
                result.assets.push(...(sheetAssets as unknown as Asset[]));
            }
        }

    } catch (e) {
        console.error("Error parsing Excel file:", e);
        result.errors.push(e instanceof Error ? e.message : "An unknown error occurred during parsing.");
    }
    
    return result;
}

export async function parseExcelForTemplate(file: File): Promise<SheetDefinition[]> {
  const templates: SheetDefinition[] = [];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  const engine = new ParserEngine(file.name);

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
    
    const groups = engine.discoverGroups(sheetName, sheetData);

    if (groups.length > 0) {
        // Create unified fields based on first discovered template
        const primaryGroup = groups[0];
        const displayFields: DisplayField[] = primaryGroup.headerSet.map(h => {
            const key = normalizeHeaderName(h);
            return {
                key: key as keyof Asset,
                label: h,
                table: ['sn', 'description', 'location', 'asset_id_code'].includes(key),
                quickView: true
            };
        });

        templates.push({
            name: sheetName,
            headers: primaryGroup.headerSet,
            displayFields,
            groups: groups
        });
    }
  }

  if (templates.length === 0) {
    throw new Error("Could not find any structural nodes in the provided Excel file.");
  }

  return templates;
}
