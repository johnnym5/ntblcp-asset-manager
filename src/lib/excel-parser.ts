import type { Asset, SheetDefinition, DisplayField } from './types';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_ALIASES, IHVN_SUB_SHEET_DEFINITIONS } from './constants';
import { Timestamp } from 'firebase/firestore';
import { AssetSchema } from './validation/asset-schema';

/**
 * Normalizes a header string by trimming and converting to uppercase.
 */
const normalizeHeader = (header: unknown): string => {
    if (header === null || header === undefined) return '';
    return String(header).trim().toUpperCase().replace(/\s+/g, ' ');
};

/**
 * Attempts to find the header row index in a raw Excel sheet array.
 */
const findHeaderRowIndex = (sheetData: unknown[][], definitiveHeaders: string[], startRow: number = 0): number => {
    const normalizedDefinitiveHeaders = definitiveHeaders.map(normalizeHeader);
    
    for (let i = startRow; i < Math.min(sheetData.length, startRow + 50); i++) {
        const row = sheetData[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedDefinitiveHeaders.filter(h => normalizedRow.includes(h)).length;
        
        if (matchCount / definitiveHeaders.length >= 0.7) {
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

/**
 * Recursively trims strings and prepares object for database storage.
 */
export const sanitizeForFirestore = <T extends object>(obj: T): T => {
    if (!obj) return obj;
    const sanitizedObj: Record<string, unknown> = {};
    
    for (const key in obj) {
        const value = (obj as any)[key];
        if (value !== undefined && value !== null) {
            if (value instanceof Date) {
                sanitizedObj[key] = Timestamp.fromDate(value);
            } else if (typeof value === 'string') {
                sanitizedObj[key] = value.trim();
            } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Timestamp)) {
                sanitizedObj[key] = sanitizeForFirestore(value);
            } else {
                sanitizedObj[key] = value;
            }
        }
    }
    return sanitizedObj as T;
};

/**
 * Parses a set of Excel rows into Asset objects based on a header row.
 */
const parseRows = (headerRow: unknown[], jsonData: unknown[][], category: string): { assets: Partial<Asset>[], rowsParsed: number } => {
    const assets: Partial<Asset>[] = [];
    let rowsParsed = 0;

    for (const row of jsonData) {
        if (!Array.isArray(row)) continue;
        rowsParsed++;

        const firstCell = row[0] ? String(row[0]).trim().toLowerCase() : '';
        const isEndOfTable = firstCell.startsWith('total') || firstCell.startsWith('grand total');

        if (row.every(cell => cell === null || String(cell).trim() === '') || (row[0] && normalizeHeader(row[0]) === 'S/N' && assets.length > 0) || isEndOfTable) {
             rowsParsed--;
            break;
        }

        const assetObject: Partial<Asset> = { category };
        let hasData = false;
        
        headerRow.forEach((rawHeader, colIndex) => {
            if (rawHeader === null || rawHeader === undefined) return;

            const normalizedHeader = normalizeHeader(rawHeader);
            let fieldName = COLUMN_TO_ASSET_FIELD_MAP.get(normalizedHeader);
            
            if(normalizedHeader === 'STATE' && !assetObject.location) fieldName = 'location';
            if(normalizedHeader === 'LOCATION/USER') fieldName = 'assignee';
            
            if (fieldName) {
                const cell = row[colIndex];
                const finalValue = (cell !== null && cell !== undefined && typeof cell === 'object' && 'w' in (cell as any)) ? String((cell as any).w).trim() : (cell !== null && cell !== undefined ? String(cell).trim() : null);

                if (finalValue) {
                   (assetObject as any)[fieldName] = finalValue;
                   hasData = true;
                }
            }
        });
        
        if (hasData && (assetObject.description || assetObject.assetIdCode || assetObject.serialNumber)) {
           const newAsset: Partial<Asset> = { 
                ...assetObject, 
                verifiedStatus: 'Unverified',
            };
            assets.push(newAsset);
        }
    }
    return { assets, rowsParsed };
}

const haveAssetDetailsChanged = (a: Partial<Asset>, b: Partial<Asset>): boolean => {
    const keys = Object.keys(b) as (keyof Asset)[];
    for (const key of keys) {
        if (['id', 'syncStatus', 'lastModified', 'lastModifiedBy', 'lastModifiedByState', 'previousState'].includes(key)) {
            continue;
        }
        const valA = String(a[key] ?? '').trim();
        const valB = String(b[key] ?? '').trim();
        if (valA !== valB) return true;
    }
    return false;
};

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
        const XLSX = await import('xlsx');
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const sheetData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            
            let bestMatch: { definitionName: string, headerRowIndex: number, score: number } | null = null;

            for (const defName in sheetDefinitions) {
                const definition = sheetDefinitions[defName];
                const normalizedDefinitiveHeaders = definition.headers.map(normalizeHeader);
                
                if(normalizedDefinitiveHeaders.length === 0) continue;
                
                for (let i = 0; i < Math.min(sheetData.length, 50); i++) {
                    const row = sheetData[i];
                    if (!Array.isArray(row) || row.length < normalizedDefinitiveHeaders.length * 0.5) continue;

                    const normalizedRow = row.map(normalizeHeader);
                    const matchCount = normalizedDefinitiveHeaders.filter(h => normalizedRow.includes(h)).length;
                    const score = matchCount / normalizedDefinitiveHeaders.length;

                    if (score >= 0.7 && (!bestMatch || score > bestMatch.score)) {
                        bestMatch = { definitionName: defName, headerRowIndex: i, score: score };
                    }
                }
            }

            if (bestMatch) {
                const { definitionName, headerRowIndex } = bestMatch;
                const dataRows = sheetData.slice(headerRowIndex + 1);
                const rowCount = dataRows.filter(row => Array.isArray(row) && row.some(cell => cell !== null && String(cell).trim() !== '')).length;
                const headers = (sheetData[headerRowIndex] as unknown[]).filter(h => h !== null).map(String);
                
                scannedSheets.push({
                    sheetName,
                    definitionName,
                    rowCount,
                    headers,
                });
            }
        }

        if (scannedSheets.length === 0) {
            errors.push("No matching asset sheets were found in this workbook based on the current settings.");
        }

    } catch (e) {
        if (e instanceof Error && e.message.toLowerCase().includes('bad compressed size')) {
            errors.push("The selected file appears to be corrupt or is not a valid Excel (.xlsx) file.");
        } else {
            errors.push(e instanceof Error ? e.message : "An unknown error occurred during scanning.");
        }
    }

    return { scannedSheets, errors };
}

export async function parseExcelFile(
    fileOrBuffer: File | ArrayBuffer, 
    sheetDefinitions: Record<string, SheetDefinition>,
    lockAssetList: boolean,
    existingAssets: Asset[],
    sheetsToImport?: ScannedSheetInfo[]
): Promise<{ assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] }> {
    
    const result: { assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] } = {
        assets: [],
        updatedAssets: [],
        skipped: 0,
        errors: [],
    };
    let parsedAssets: Partial<Asset>[] = [];

    try {
        const XLSX = await import('xlsx');
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellText: false });

        const processList: ScannedSheetInfo[] = sheetsToImport 
            ? sheetsToImport 
            : Object.keys(sheetDefinitions).map(defName => {
                const actualSheetName = workbook.SheetNames.find(s => normalizeHeader(s).includes(normalizeHeader(defName)));
                return actualSheetName ? { sheetName: actualSheetName, definitionName: defName, rowCount: 0, headers: [] } : null;
            }).filter((item): item is ScannedSheetInfo => item !== null);

        for (const { sheetName, definitionName } of processList) {
            const definition = sheetDefinitions[definitionName];
            if (!definition) {
                result.errors.push(`No definition found for sheet: "${definitionName}".`);
                continue;
            }

            // Handle IHVN special case
            if (definitionName === 'IHVN-GF N-THRIP') {
                 const sheet = workbook.Sheets[sheetName];
                 const sheetData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
                 let currentPos = 0;
                 for (const subSheetName in IHVN_SUB_SHEET_DEFINITIONS) {
                    const headers = IHVN_SUB_SHEET_DEFINITIONS[subSheetName];
                    const headerRowIndex = findHeaderRowIndex(sheetData, headers, currentPos);
                    if (headerRowIndex !== -1) {
                        const headerRow = sheetData[headerRowIndex];
                        const { assets: parsedGroupAssets, rowsParsed } = parseRows(headerRow, sheetData.slice(headerRowIndex + 1), 'IHVN-GF N-THRIP');
                        parsedAssets.push(...parsedGroupAssets);
                        currentPos = headerRowIndex + rowsParsed + 1;
                    }
                }
                continue;
            }

            const sheet = workbook.Sheets[sheetName];
            if (!sheet) {
                result.errors.push(`Could not find sheet named "${sheetName}" in the workbook.`);
                continue;
            }
            const sheetData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            const headerRowIndex = findHeaderRowIndex(sheetData, definition.headers);

            if (headerRowIndex === -1) {
                result.errors.push(`Could not find a valid header row in sheet: "${sheetName}".`);
                continue;
            }
            
            const headerRow = sheetData[headerRowIndex];
            const jsonData = sheetData.slice(headerRowIndex + 1);
            const { assets: parsedSheetAssets } = parseRows(headerRow, jsonData, definitionName);
            parsedAssets.push(...parsedSheetAssets);
        }
        
        const existingAssetMap = new Map(existingAssets.map(a => [`${a.sn || ''}-${a.assetIdCode || ''}-${a.description || ''}`.toLowerCase(), a.id]));

        for (const parsedAsset of parsedAssets) {
            // PHASE 3: Data Validation using Zod
            const validation = AssetSchema.safeParse(parsedAsset);
            if (!validation.success) {
                const errorMessages = validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
                result.errors.push(`Row validation failed: ${parsedAsset.description || 'Unknown'} - ${errorMessages}`);
                continue;
            }

            const assetKey = `${parsedAsset.sn || ''}-${parsedAsset.assetIdCode || ''}-${parsedAsset.description || ''}`.toLowerCase();
            if (existingAssetMap.has(assetKey)) {
                const existingId = existingAssetMap.get(assetKey)!;
                const existingAsset = existingAssets.find(a => a.id === existingId)!;
                if (haveAssetDetailsChanged(existingAsset, parsedAsset)) {
                     result.updatedAssets.push(sanitizeForFirestore({ ...existingAsset, ...parsedAsset }));
                } else {
                     result.skipped++;
                }
            } else {
                 if (!lockAssetList) {
                    result.assets.push(sanitizeForFirestore({ ...parsedAsset, id: uuidv4() } as Asset));
                 } else {
                    result.skipped++;
                 }
            }
        }
        
        if (result.assets.length === 0 && result.updatedAssets.length === 0 && result.errors.length === 0) {
             result.errors.push(`No data to import. Check sheet names and headers.`);
        }

    } catch (e) {
        if (e instanceof Error && e.message.toLowerCase().includes('bad compressed size')) {
            result.errors.push("The selected file appears to be corrupt or is not a valid Excel (.xlsx) file.");
        } else {
             result.errors.push(e instanceof Error ? e.message : "An unknown error occurred during parsing.");
        }
    }
    
    return result;
}

/**
 * Exports verified assets to a multi-sheet Excel workbook.
 */
export async function exportToExcel(assets: Asset[], sheetDefinitions: Record<string, SheetDefinition>, fileName: string): Promise<void> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    const assetsByCategory = assets.reduce((acc, asset) => {
        const category = asset.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(asset);
        return acc;
    }, {} as Record<string, Asset[]>);
    
    for (const category in assetsByCategory) {
        const definition = sheetDefinitions[category];
        if (!definition) continue;

        const headerArray = definition?.headers?.length > 0 ? [...definition.headers] : [];
        if (headerArray.length === 0) continue; 
        
        if (!headerArray.includes("Verified Status")) headerArray.push("Verified Status");
        if (!headerArray.includes("Verified Date")) headerArray.push("Verified Date");
        if (!headerArray.includes("Last Modified By")) headerArray.push("Last Modified By");
        if (!headerArray.includes("Last Modified Date")) headerArray.push("Last Modified Date");
        
        const sheetData = assetsByCategory[category].map(asset => {
            const row: Record<string, unknown> = {};
            headerArray.forEach(header => {
                const normalizedHeader = normalizeHeader(header);
                
                let assetKey: keyof Asset | undefined;
                for (const key in HEADER_ALIASES) {
                    if (HEADER_ALIASES[key as keyof typeof HEADER_ALIASES].map(a => normalizeHeader(a)).includes(normalizedHeader)) {
                        assetKey = key as keyof Asset;
                        break;
                    }
                }
                
                if (assetKey) {
                   row[header] = asset[assetKey] ?? '';
                } else {
                   if (normalizedHeader === 'VERIFIED STATUS') row[header] = asset.verifiedStatus || 'Unverified';
                   else if (normalizedHeader === 'VERIFIED DATE') row[header] = asset.verifiedDate || '';
                   else if (normalizedHeader === 'LAST MODIFIED BY') row[header] = asset.lastModifiedBy || '';
                   else if (normalizedHeader === 'LAST MODIFIED DATE') row[header] = asset.lastModified ? new Date(asset.lastModified).toLocaleString() : '';
                   else row[header] = '';
                }
            });
            return row;
        });
        
        const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: headerArray });
        const safeSheetName = category.replace(/[\\/?*[\]]/g, '-').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
    }

    if (workbook.SheetNames.length > 0) {
        XLSX.writeFile(workbook, fileName);
    } else {
        throw new Error("No data was available to export.");
    }
}

/**
 * Scans an Excel file to extract potential sheet definitions (headers).
 */
export async function parseExcelForTemplate(file: File): Promise<SheetDefinition[]> {
  const XLSX = await import('xlsx');
  const templates: SheetDefinition[] = [];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const allPossibleHeaders = new Set<string>();
  Object.values(HEADER_ALIASES).flat().forEach(h => allPossibleHeaders.add(normalizeHeader(h)));

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    for (let i = 0; i < Math.min(sheetData.length, 25); i++) {
        const row = sheetData[i];
        if (!Array.isArray(row)) continue;
        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedRow.filter(h => allPossibleHeaders.has(h)).length;

        if (matchCount > 5) {
            const headerRow = row.map(h => String(h || '').trim()).filter(h => h);
            const displayFields: DisplayField[] = [];

            for (const header of headerRow) {
                const normalizedHeader = normalizeHeader(header);
                let fieldKey: keyof Asset | undefined;

                for (const key in HEADER_ALIASES) {
                    if (HEADER_ALIASES[key as keyof typeof HEADER_ALIASES].map(a => normalizeHeader(a)).includes(normalizedHeader)) {
                        fieldKey = key as keyof Asset;
                        break;
                    }
                }

                if (fieldKey) {
                    const showInTable = ['sn', 'description', 'assetIdCode', 'location', 'assignee', 'verifiedStatus'].includes(fieldKey);
                    displayFields.push({
                        key: fieldKey,
                        label: header,
                        table: showInTable,
                        quickView: showInTable,
                    });
                }
            }

            if (displayFields.length > 0) {
                 templates.push({
                    name: sheetName,
                    headers: headerRow,
                    displayFields: displayFields,
                });
            }
            break; 
        }
    }
  }

  if (templates.length === 0) {
    throw new Error("Could not find any valid header rows in the provided Excel file.");
  }

  return templates;
}