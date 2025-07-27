
import * as XLSX from 'xlsx';
import type { Asset, AppSettings, SheetDefinition, DisplayField } from './types';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_ALIASES, IHVN_SUB_SHEET_DEFINITIONS } from './constants';
import { Timestamp } from 'firebase/firestore';

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
        
        // Use a more robust matching threshold
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

const parseRows = (headerRow: any[], jsonData: any[][], category: string): { assets: Asset[], rowsParsed: number } => {
    const assets: Asset[] = [];
    let rowsParsed = 0;

    for (const row of jsonData) {
        rowsParsed++;

        const firstCell = row[0] ? String(row[0]).trim().toLowerCase() : '';
        const isEndOfTable = category === 'NTBLCP-TB-FAR' && (firstCell.startsWith('total') || firstCell.startsWith('grand total'));

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
            
            if(category.startsWith('IHVN')) {
                if(normalizedHeader === 'LOCATION') fieldName = 'location'; // Use LOCATION as the main location field.
                if(normalizedHeader === 'STATE') fieldName = undefined; // Ignore the STATE column to avoid conflicts.
                if(normalizedHeader === 'LOCATION/USER') fieldName = 'assignee';
            }
            
            if (fieldName) {
                const cell = row[colIndex];
                const finalValue = (cell && cell.w) ? String(cell.w).trim() : (cell !== null && cell !== undefined ? String(cell).trim() : null);

                if (finalValue) {
                   (assetObject as any)[fieldName] = finalValue;
                   hasData = true;
                }
            }
        });
        
        if (hasData && (assetObject.description || assetObject.assetIdCode || assetObject.serialNumber)) {
           const newAsset: Asset = { 
                id: uuidv4(), 
                ...assetObject, 
                verifiedStatus: 'Unverified',
            } as Asset;
            assets.push(newAsset);
        }
    }
    return { assets, rowsParsed };
}


export async function parseExcelFile(
    fileOrBuffer: File | ArrayBuffer, 
    appSettings: AppSettings, 
    existingAssets: Asset[],
    singleSheetName?: string
): Promise<{ assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] }> {
    const { sheetDefinitions } = appSettings;
    
    const result: { assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] } = {
        assets: [],
        updatedAssets: [],
        skipped: 0,
        errors: [],
    };

    try {
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellText: false });
        
        const isIHVNImport = singleSheetName === 'IHVN-GF N-THRIP' || (!singleSheetName && appSettings.enabledSheets.includes('IHVN-GF N-THRIP'));
        let ihvnMasterSheetName: string | undefined;

        if (isIHVNImport) {
            ihvnMasterSheetName = workbook.SheetNames.find(s => normalizeHeader(s).includes(normalizeHeader('IHVN-GF N-THRIP')));
            if (ihvnMasterSheetName) {
                const sheet = workbook.Sheets[ihvnMasterSheetName];
                const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
                let currentPos = 0;
                
                 for (const subSheetName in IHVN_SUB_SHEET_DEFINITIONS) {
                    const headers = IHVN_SUB_SHEET_DEFINITIONS[subSheetName];
                    const headerRowIndex = findHeaderRowIndex(sheetData, headers, currentPos);

                    if (headerRowIndex !== -1) {
                        const headerRow = sheetData[headerRowIndex];
                        const groupData = sheetData.slice(headerRowIndex + 1);
                        const { assets: parsedGroupAssets, rowsParsed } = parseRows(headerRow, groupData, 'IHVN-GF N-THRIP');
                        result.assets.push(...parsedGroupAssets);
                        currentPos = headerRowIndex + rowsParsed + 1;
                    }
                }
            } else if (singleSheetName === 'IHVN-GF N-THRIP') {
                 result.errors.push(`Could not find a sheet named "IHVN-GF N-THRIP" in the file.`);
            }
        }

        const sheetNamesToProcess = singleSheetName
            ? (singleSheetName === 'IHVN-GF N-THRIP' ? [] : [singleSheetName])
            : Object.keys(sheetDefinitions).filter(sheetName => appSettings.enabledSheets.includes(sheetName) && sheetName !== 'IHVN-GF N-THRIP');

        for (const targetSheetName of sheetNamesToProcess) {
            const definition = sheetDefinitions[targetSheetName];
            if (!definition) {
                 if(singleSheetName) result.errors.push(`No definition found for sheet: "${targetSheetName}".`);
                 continue;
            }
            
            const actualSheetName = workbook.SheetNames.find(s => normalizeHeader(s).includes(normalizeHeader(targetSheetName)));

            if (!actualSheetName || actualSheetName === ihvnMasterSheetName) {
                if (singleSheetName && actualSheetName !== ihvnMasterSheetName) result.errors.push(`Could not find a sheet with the name: "${targetSheetName}".`);
                continue;
            }

            const sheet = workbook.Sheets[actualSheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            
            const headerRowIndex = findHeaderRowIndex(sheetData, definition.headers);

            if (headerRowIndex === -1) {
                result.errors.push(`Could not find a valid header row in sheet: "${actualSheetName}".`);
                continue;
            }
            
            const headerRow = sheetData[headerRowIndex];
            const jsonData = sheetData.slice(headerRowIndex + 1);
            const { assets: parsedSheetAssets } = parseRows(headerRow, jsonData, targetSheetName);
            result.assets.push(...parsedSheetAssets);
        }

        if (result.assets.length === 0 && result.errors.length === 0) {
            result.errors.push(`No data found to import. Check if sheet names in the file match the enabled sheets in Settings.`);
        }
    } catch (e) {
        console.error("Error parsing Excel file:", e);
        if (e instanceof Error && e.message.includes('permission')) {
             result.errors.push('The requested file could not be read, typically due to permission problems.');
        } else {
             result.errors.push(e instanceof Error ? e.message : "An unknown error occurred during parsing.");
        }
    }
    
    return result;
}



export function exportToExcel(assets: Asset[], sheetDefinitions: Record<string, SheetDefinition>, fileName: string): void {
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
            const row: { [key: string]: any } = {};
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


export async function parseExcelForTemplate(file: File): Promise<SheetDefinition[]> {
  const templates: SheetDefinition[] = [];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const allPossibleHeaders = new Set<string>();
  Object.values(HEADER_ALIASES).flat().forEach(h => allPossibleHeaders.add(normalizeHeader(h)));

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
        const row = sheetData[i];
        if (!Array.isArray(row)) continue;
        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedRow.filter(h => allPossibleHeaders.has(h)).length;

        if (matchCount > 5) {
            const headerRow = row.map(h => String(h || '').trim()).filter(h => h);
            
            const displayFields: DisplayField[] = headerRow.map(header => {
              const normalized = normalizeHeader(header);
              for (const key in HEADER_ALIASES) {
                if (HEADER_ALIASES[key as keyof typeof HEADER_ALIASES].map(a => normalizeHeader(a)).includes(normalized)) {
                  return {
                    key: key as keyof Asset,
                    label: header,
                    table: ['S/N', 'DESCRIPTION', 'ASSET ID CODE', 'ASSIGNEE', 'VERIFIED STATUS'].includes(normalized),
                    quickView: true,
                  };
                }
              }
              return null;
            }).filter(Boolean) as DisplayField[];

            templates.push({
                name: sheetName,
                headers: headerRow,
                displayFields: displayFields,
            });
            break; 
        }
    }
  }

  if (templates.length === 0) {
    throw new Error("Could not find any valid header rows in the provided Excel file.");
  }

  return templates;
}
