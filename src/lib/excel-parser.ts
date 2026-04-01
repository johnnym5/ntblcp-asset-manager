
import * as XLSX from 'xlsx';
import type { Asset, AppSettings, SheetDefinition, DisplayField } from '@/types/domain';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_ALIASES } from './constants';

/**
 * Normalizes a header string by trimming and converting to uppercase.
 */
const normalizeHeader = (header: any): string => {
    if (header === null || header === undefined) return '';
    return String(header).trim().toUpperCase().replace(/\s+/g, ' ');
};

/**
 * Detects if a row is likely a Section/Group header.
 */
const isSectionRow = (row: any[]): string | null => {
    if (!row || !Array.isArray(row)) return null;
    const populated = row.filter(c => c !== null && String(c).trim() !== '');
    if (populated.length === 1 && typeof populated[0] === 'string') {
        const text = populated[0].trim();
        const upper = text.toUpperCase();
        
        const isDocHeader = upper.includes('NATIONAL TUBERCULOSIS') || upper.includes('GLOBAL FUND');
        const isSN = upper === 'S/N' || upper === 'SN';
        const isNumeric = !isNaN(Number(text));

        if (!isDocHeader && !isSN && !isNumeric && text.length > 3) {
            return text;
        }
    }
    return null;
};

const findHeaderRowIndex = (sheetData: any[][], definitiveHeaders: string[], startRow: number = 0): number => {
    const normalizedDefinitiveHeaders = definitiveHeaders.map(normalizeHeader);
    
    for (let i = startRow; i < Math.min(sheetData.length, startRow + 50); i++) {
        const row = sheetData[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedDefinitiveHeaders.filter(h => normalizedRow.includes(h)).length;
        
        if (matchCount / (normalizedDefinitiveHeaders.length || 1) >= 0.6) {
            return i;
        }
    }
    return -1;
};

const COLUMN_TO_ASSET_FIELD_MAP = new Map<string, keyof Asset>();
for (const key in HEADER_ALIASES) {
    const assetKey = key as keyof Asset;
    const aliases = HEADER_ALIASES[assetKey as keyof typeof HEADER_ALIASES];
    if (aliases) {
        for (const alias of aliases) {
            COLUMN_TO_ASSET_FIELD_MAP.set(normalizeHeader(alias), assetKey);
        }
    }
}

export interface ScannedSheetInfo {
  sheetName: string;
  definitionName: string;
  rowCount: number;
  headers: string[];
  sectionsDetected: string[];
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
            
            for (const defName in sheetDefinitions) {
                const definition = sheetDefinitions[defName];
                const headerRowIndex = findHeaderRowIndex(sheetData, definition.headers || []);

                if (headerRowIndex !== -1) {
                    const dataRows = sheetData.slice(headerRowIndex + 1);
                    const sections: string[] = [];
                    let rowCount = 0;

                    dataRows.forEach(row => {
                        const sec = isSectionRow(row);
                        if (sec) {
                            sections.push(sec);
                        } else if (Array.isArray(row) && row.some(cell => cell !== null && String(cell).trim() !== '')) {
                            rowCount++;
                        }
                    });

                    const headers = (sheetData[headerRowIndex] || []).filter(h => h !== null).map(String);
                    
                    scannedSheets.push({
                        sheetName: sheetName,
                        definitionName: defName,
                        rowCount: rowCount,
                        headers: headers,
                        sectionsDetected: sections
                    });
                    
                    break; 
                }
            }
        }
        if (scannedSheets.length === 0) {
            errors.push("No matching asset categories were detected in this workbook.");
        }

    } catch (e) {
        errors.push(e instanceof Error ? e.message : "An unknown error occurred during scanning.");
    }

    return { scannedSheets, errors };
}

export async function parseExcelFile(
    fileOrBuffer: File | ArrayBuffer, 
    sheetDefinitions: Record<string, SheetDefinition>, 
    existingAssets: Asset[],
    sheetsToImport: ScannedSheetInfo[]
): Promise<{ assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] }> {
    const result: { assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] } = {
        assets: [],
        updatedAssets: [],
        skipped: 0,
        errors: [],
    };

    try {
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellText: false });

        for (const { sheetName, definitionName } of sheetsToImport) {
            const definition = sheetDefinitions[definitionName];
            if (!definition) continue;

            const sheet = workbook.Sheets[sheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            const headerRowIndex = findHeaderRowIndex(sheetData, definition.headers || []);

            if (headerRowIndex === -1) continue;
            
            const headerRow = sheetData[headerRowIndex];
            const jsonData = sheetData.slice(headerRowIndex + 1);
            
            let currentSection = 'General';
            
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];
                const newSection = isSectionRow(row);
                if (newSection) {
                    currentSection = newSection;
                    continue;
                }

                if (!row || row.every(cell => cell === null || String(cell).trim() === '')) continue;

                const asset: any = {
                    id: uuidv4(),
                    category: definitionName,
                    section: currentSection,
                    status: 'UNVERIFIED',
                    condition: 'New',
                    lastModified: new Date().toISOString(),
                    metadata: {}
                };

                headerRow.forEach((rawHeader, colIndex) => {
                    if (!rawHeader) return;
                    const normalizedHeader = normalizeHeader(rawHeader);
                    const fieldName = COLUMN_TO_ASSET_FIELD_MAP.get(normalizedHeader);
                    const cellValue = row[colIndex];

                    if (fieldName) {
                        asset[fieldName] = cellValue !== null ? String(cellValue).trim() : '';
                    } else if (cellValue !== null) {
                        asset.metadata[String(rawHeader)] = cellValue;
                    }
                });

                if (asset.description || asset.serialNumber) {
                    result.assets.push(asset as Asset);
                }
            }
        }
    } catch (e) {
        result.errors.push(e instanceof Error ? e.message : "Parsing failed.");
    }
    
    return result;
}

export async function parseExcelForTemplate(file: File): Promise<SheetDefinition[]> {
  const templates: SheetDefinition[] = [];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const allPossibleHeaders = new Set<string>();
  Object.values(HEADER_ALIASES).flat().forEach(h => allPossibleHeaders.add(normalizeHeader(h)));

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    for (let i = 0; i < Math.min(sheetData.length, 20); i++) {
        const row = sheetData[i];
        if (!Array.isArray(row)) continue;
        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedRow.filter(h => allPossibleHeaders.has(h)).length;

        if (matchCount > 4) {
            const headerRow = row.map(h => String(h || '').trim()).filter(h => h);
            const displayFields: DisplayField[] = headerRow.map(h => {
                const normalized = normalizeHeader(h);
                let key: any = 'description';
                for (const k in HEADER_ALIASES) {
                    if (HEADER_ALIASES[k as keyof typeof HEADER_ALIASES].map(normalizeHeader).includes(normalized)) {
                        key = k;
                        break;
                    }
                }
                return { key, label: h, table: true, quickView: true };
            });

            templates.push({
                name: sheetName,
                headers: headerRow,
                displayFields
            });
            break; 
        }
    }
  }

  if (templates.length === 0) throw new Error("No registry templates discovered.");
  return templates;
}
