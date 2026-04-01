import * as XLSX from 'xlsx';
import type { Asset, AppSettings, SheetDefinition, DisplayField } from './types';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_ALIASES, IHVN_SUB_SHEET_DEFINITIONS } from './constants';
import { AssetSchema } from './core/registry/validation';
import { sanitizeForFirestore } from './lib/utils';

/**
 * Normalizes a header string by trimming and converting to uppercase.
 */
const normalizeHeader = (header: unknown): string => {
    if (header === null || header === undefined) return '';
    return String(header).trim().toUpperCase().replace(/\s+/g, ' ');
};

/**
 * Patterns for hierarchical classification
 */
const TEMPORAL_PATTERN = /\b(20\d{2})\b.*\b(additional|additions|procured|newly|added)\b/i;
const QUANTITY_PATTERN = /\d+\s*(pieces|pcs|units)/i;
const TRANSFER_PATTERN = /\b(transferred|transfer|dfb_| LSMOH|IHVN|FHI360)\b.*\bassets\b/i;
const DOC_HEADER_KEYWORDS = ['CONTROL PROGRAMME', 'PROJECT', 'REPORTING FORM', 'FOCAL PERSONS', 'NTBLCP', 'GENERAL'];
const MAJOR_SECTION_KEYWORDS = ['EQUIPMENT', 'COMPUTERS', 'INHERITED', 'ASSETS', 'GENERAL', 'ELECTRONICS', 'FURNITURE'];
const ASSET_FAMILY_KEYWORDS = ['CHAIRS', 'TABLES', 'CABINETS', 'SHELVES', 'LAPTOPS', 'PRINTERS', 'SCANNERS', 'AC', 'UPS', 'GENERATORS', 'VEHICLES', 'MACHINES', 'MONITORS'];

type RowType = 'document_header' | 'major_section' | 'temporal_subsection' | 'quantity_subsection' | 'transfer_section' | 'asset_family' | 'schema_header' | 'asset_row' | 'empty';

const findHeaderRowIndex = (sheetData: any[][], definitiveHeaders: string[], startRow: number = 0): number => {
    const normalizedDefinitiveHeaders = definitiveHeaders.map(normalizeHeader);
    
    for (let i = startRow; i < Math.min(sheetData.length, startRow + 50); i++) {
        const row = sheetData[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedDefinitiveHeaders.filter(h => normalizedRow.includes(h)).length;
        
        if (matchCount / (definitiveHeaders.length || 1) >= 0.6) {
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

const parseRows = (headerRow: any[], jsonData: any[][], category: string): { assets: Partial<Asset>[], rowsParsed: number } => {
    const assets: Partial<Asset>[] = [];
    let rowsParsed = 0;

    for (const row of jsonData) {
        rowsParsed++;
        if (!row || row.every(cell => !cell || String(cell).trim() === '')) break;

        const assetObject: Partial<Asset> = { category, status: 'UNVERIFIED', condition: 'New' };
        let hasData = false;
        
        headerRow.forEach((rawHeader, colIndex) => {
            if (!rawHeader) return;
            const normalizedHeader = normalizeHeader(rawHeader);
            const fieldName = COLUMN_TO_ASSET_FIELD_MAP.get(normalizedHeader);
            
            if (fieldName) {
                const cell = row[colIndex];
                const finalValue = (cell !== null && cell !== undefined) ? String(cell).trim() : null;
                if (finalValue) {
                    (assetObject as any)[fieldName] = finalValue;
                    hasData = true;
                }
            }
        });
        
        if (hasData) assets.push(assetObject);
    }
    return { assets, rowsParsed };
}

export interface ScannedSheetInfo {
  sheetName: string;
  definitionName: string;
  rowCount: number;
  headers: string[];
}

export async function scanExcelFile(
  fileOrBuffer: File | ArrayBuffer,
  sheetDefinitions: Record<string, SheetDefinition>,
): Promise<{ scannedSheets: ScannedSheetInfo[], errors: string[] }> {
    const scannedSheets: ScannedSheetInfo[] = [];
    const errors: string[] = [];

    try {
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            
            let bestMatch: any = null;

            for (const defName in sheetDefinitions) {
                const definition = sheetDefinitions[defName];
                const headerRowIndex = findHeaderRowIndex(sheetData, definition.headers || []);

                if (headerRowIndex !== -1) {
                    const rowCount = sheetData.slice(headerRowIndex + 1).length;
                    const headers = (sheetData[headerRowIndex] || []).filter(h => h).map(String);
                    
                    if (!bestMatch || (headers.length > (bestMatch.headers?.length || 0))) {
                        bestMatch = { definitionName: defName, rowCount, headers };
                    }
                }
            }

            if (bestMatch) {
                scannedSheets.push({
                    sheetName,
                    definitionName: bestMatch.definitionName,
                    rowCount: bestMatch.rowCount,
                    headers: bestMatch.headers,
                });
            }
        }
    } catch (e) {
        errors.push(e instanceof Error ? e.message : "Scanning failed.");
    }

    return { scannedSheets, errors };
}

export async function parseExcelFile(
    fileOrBuffer: File | ArrayBuffer, 
    sheetDefinitions: Record<string, SheetDefinition>,
    enabledSheets: string[],
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
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

        const processList = sheetsToImport || [];

        for (const { sheetName, definitionName } of processList) {
            const sheet = workbook.Sheets[sheetName];
            const definition = sheetDefinitions[definitionName];
            if (!sheet || !definition) continue;

            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
            const headerRowIndex = findHeaderRowIndex(sheetData, definition.headers || []);

            if (headerRowIndex !== -1) {
                const { assets: parsed } = parseRows(sheetData[headerRowIndex], sheetData.slice(headerRowIndex + 1), definitionName);
                
                parsed.forEach(p => {
                    const asset = {
                        ...p,
                        id: uuidv4(),
                        lastModified: new Date().toISOString(),
                        lastModifiedBy: 'System Ingestion',
                        hierarchy: { document: sheetName, section: 'General', subsection: 'Base Register', assetFamily: 'Uncategorized' },
                        importMetadata: { sourceFile: 'Workbook', sheetName, rowNumber: 0, importedAt: new Date().toISOString() },
                        metadata: {}
                    } as Asset;

                    const isDup = existingAssets.some(a => a.serialNumber === asset.serialNumber && a.serialNumber !== 'N/A');
                    if (isDup) result.skipped++;
                    else result.assets.push(asset);
                });
            }
        }
    } catch (e) {
        result.errors.push(e instanceof Error ? e.message : "Parsing failed.");
    }
    
    return result;
}

export async function parseExcelForTemplate(file: File): Promise<SheetDefinition[]> {
  const templates: SheetDefinition[] = [];
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      
      for (let i = 0; i < Math.min(sheetData.length, 20); i++) {
          const row = sheetData[i];
          if (!Array.isArray(row)) continue;
          
          const headerRow = row.map(h => String(h || '').trim()).filter(h => h.length > 1);
          if (headerRow.length > 5) {
              templates.push({
                  name: sheetName,
                  headers: headerRow,
                  displayFields: headerRow.map(h => ({
                      key: 'metadata' as any,
                      label: h,
                      table: true,
                      quickView: true
                  }))
              });
              break;
          }
      }
    }
  } catch (e) {
    console.error("Template parse failed", e);
  }
  return templates;
}
