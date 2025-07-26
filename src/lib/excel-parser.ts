
import * as XLSX from 'xlsx';
import type { Asset, AppSettings, SheetDefinition, DisplayField } from './types';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_ALIASES, HEADER_DEFINITIONS } from './constants';
import { Timestamp } from 'firebase/firestore';

const normalizeHeader = (header: any): string => {
    if (header === null || header === undefined) return '';
    return String(header).trim().toUpperCase().replace(/\s+/g, ' ');
};

const findHeaderRowIndex = (sheetData: any[][], definitiveHeaders: string[], startRow: number = 0): number => {
    const normalizedDefinitiveHeaders = definitiveHeaders.map(normalizeHeader);
    
    for (let i = startRow; i < Math.min(sheetData.length, startRow + 20); i++) {
        const row = sheetData[i];
        if (!Array.isArray(row)) continue;

        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedDefinitiveHeaders.filter(h => normalizedRow.includes(h)).length;
        
        // A row is considered the header if it contains over 70% of the expected headers.
        if (matchCount / normalizedDefinitiveHeaders.length > 0.7) {
            return i;
        }
    }
    return -1;
};

// This map is built from the aliases defined in constants.ts to quickly find the correct asset field for a given column header.
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
// Special mapping for IHVN sheets which have some inconsistent header naming.
COLUMN_TO_ASSET_FIELD_MAP.set('IHVN-GF N-THRIP:LOCATION', 'lga');
COLUMN_TO_ASSET_FIELD_MAP.set('IHVN-GF N-THRIP:STATE', 'location');

/**
 * Prepares an asset object for saving to Firestore. It removes any undefined fields 
 * and temporary local-only fields like 'previousState' to prevent sync errors.
 * It also converts any JavaScript Date objects to Firestore Timestamps.
 * @param obj The asset object.
 * @returns A sanitized object ready for Firestore.
 */
export const sanitizeForFirestore = <T extends object>(obj: T): T => {
    const sanitizedObj: { [key: string]: any } = {};
    for (const key in obj) {
        const value = (obj as any)[key];
        if (key === 'previousState') {
            continue; // Skip the temporary previousState field
        }
        if (value !== undefined) {
            if (value instanceof Date) {
                // Convert JS Date to Firestore Timestamp
                sanitizedObj[key] = Timestamp.fromDate(value);
            } else {
                sanitizedObj[key] = value;
            }
        }
    }
    return sanitizedObj as T;
};

const parseRows = (headerRow: any[], jsonData: any[][], category: string): Asset[] => {
    const assets: Asset[] = [];
    for (const row of jsonData) {
        // Skip empty rows
        if (row.every(cell => cell === null || String(cell).trim() === '')) continue;

        const assetObject: Partial<Asset> = { category };
        let hasData = false;
        
        headerRow.forEach((rawHeader, colIndex) => {
            if (rawHeader === null || rawHeader === undefined) return;

            const normalizedHeader = normalizeHeader(rawHeader);
            let fieldName = COLUMN_TO_ASSET_FIELD_MAP.get(normalizedHeader);
            
            // Special handling for IHVN sheets where 'LOCATION' means 'LGA' and 'STATE' means 'Location'
            if(category.startsWith('IHVN')) {
                if(normalizedHeader === 'LOCATION') fieldName = 'lga';
                if(normalizedHeader === 'STATE') fieldName = 'location';
            }
            
            if (fieldName) {
                const cell = row[colIndex];
                // Prioritize formatted text (.w), fall back to raw value (.v)
                const finalValue = (cell && cell.w) ? String(cell.w).trim() : (cell !== null && cell !== undefined ? String(cell).trim() : null);

                if (finalValue) {
                   (assetObject as any)[fieldName] = finalValue;
                   hasData = true;
                }
            }
        });
        
        // A row is considered a valid asset if it has some data and at least one key identifier.
        if (hasData && (assetObject.description || assetObject.assetIdCode || assetObject.serialNumber)) {
           const newAsset: Asset = { 
                id: uuidv4(), 
                ...assetObject, 
                verifiedStatus: 'Unverified',
            } as Asset;
            assets.push(newAsset);
        }
    }
    return assets;
}


export async function parseExcelFile(
    fileOrBuffer: File | ArrayBuffer, 
    appSettings: AppSettings, 
    existingAssets: Asset[],
    singleSheetName?: string
): Promise<{ assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] }> {
    const { sheetDefinitions } = appSettings;
    let newAssets: Asset[] = [];
    const errors: string[] = [];

    try {
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellText: false });
        
        const isIHVNImport = singleSheetName ? singleSheetName.startsWith('IHVN') : workbook.SheetNames.some(s => normalizeHeader(s).includes('IHVN-GF N-THRIP'));
        
        if (isIHVNImport) {
            const ihvnMasterSheetName = workbook.SheetNames.find(s => normalizeHeader(s).includes('IHVN-GF N-THRIP'));

            if (ihvnMasterSheetName) {
                const sheet = workbook.Sheets[ihvnMasterSheetName];
                const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
                
                const groups = [
                    { category: 'IHVN-General', startRow: 0, endRow: 1591, headers: HEADER_DEFINITIONS['IHVN-General'].headers },
                    { category: 'IHVN-Computers', startRow: 1591, endRow: 1678, headers: HEADER_DEFINITIONS['IHVN-Computers'].headers },
                    { category: 'IHVN-IT Equipment', startRow: 1678, endRow: 1700, headers: HEADER_DEFINITIONS['IHVN-IT Equipment'].headers },
                    { category: 'IHVN-Inherited Assets', startRow: 1700, endRow: sheetData.length, headers: HEADER_DEFINITIONS['IHVN-Inherited Assets'].headers },
                ];

                for (const group of groups) {
                    if (singleSheetName && normalizeHeader(singleSheetName) !== normalizeHeader(group.category)) {
                        continue;
                    }

                    const headerRowIndex = findHeaderRowIndex(sheetData, group.headers, group.startRow);
                    if (headerRowIndex !== -1) {
                        const headerRow = sheetData[headerRowIndex];
                        const groupData = sheetData.slice(headerRowIndex + 1, group.endRow);
                        const parsedGroupAssets = parseRows(headerRow, groupData, group.category);
                        newAssets.push(...parsedGroupAssets);
                    } else {
                        errors.push(`Could not find headers for group "${group.category}" in sheet "${ihvnMasterSheetName}".`);
                    }
                }
            } else {
                 errors.push(`Could not find the "IHVN-GF N-THRIP" master sheet in the file.`);
            }
        }

        const sheetNamesToProcess = singleSheetName
            ? (isIHVNImport ? [] : [singleSheetName]) // If it was an IHVN import, we don't need to process again.
            : Object.keys(sheetDefinitions).filter(sheetName => appSettings.enabledSheets.includes(sheetName) && !sheetName.startsWith('IHVN'));

        for (const targetSheetName of sheetNamesToProcess) {
            const definition = sheetDefinitions[targetSheetName];
            if (!definition) {
                 if(singleSheetName) errors.push(`No definition found for sheet: "${targetSheetName}".`);
                 continue;
            }

            let actualSheetName: string | undefined;
            const normalizedTarget = normalizeHeader(targetSheetName);

            // Use exact match for single sheet import, but a more lenient 'contains' for full workbook import
            if (singleSheetName) {
                actualSheetName = workbook.SheetNames.find(s => normalizeHeader(s) === normalizedTarget);
            } else {
                actualSheetName = workbook.SheetNames.find(s => normalizeHeader(s).includes(normalizedTarget));
            }


            if (!actualSheetName) {
                if (singleSheetName) errors.push(`Could not find a sheet with the exact name: "${targetSheetName}". Check for typos or extra spaces.`);
                continue;
            }

            const sheet = workbook.Sheets[actualSheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            
            const headerRowIndex = findHeaderRowIndex(sheetData, definition.headers);

            if (headerRowIndex === -1) {
                errors.push(`Could not find a valid header row in sheet: "${actualSheetName}". Please ensure it matches the defined template.`);
                continue;
            }
            
            const headerRow = sheetData[headerRowIndex];
            const jsonData = sheetData.slice(headerRowIndex + 1);
            const parsedSheetAssets = parseRows(headerRow, jsonData, targetSheetName);
            newAssets.push(...parsedSheetAssets);
        }

        if (newAssets.length === 0 && errors.length === 0) {
            errors.push(`No data found to import. Check if sheet names in the file match the enabled sheets in Settings.`);
        }
    } catch (e) {
        console.error("Error parsing Excel file:", e);
        if (e instanceof Error && e.message.includes('permission')) {
             errors.push('The requested file could not be read, typically due to permission problems that have occurred after a reference to a file was acquired.');
        } else {
             errors.push(e instanceof Error ? e.message : "An unknown error occurred during parsing.");
        }
    }
    
    return { assets: newAssets, updatedAssets: [], skipped: 0, errors };
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
        
        // Append standard export columns if they don't exist
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
  Object.values(HEADER_DEFINITIONS).forEach(def => {
    def.headers.forEach(h => allPossibleHeaders.add(normalizeHeader(h)));
  });

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
            
            // Create a default displayFields array based on what was found.
            const displayFields: DisplayField[] = headerRow.map(header => {
              const normalized = normalizeHeader(header);
              for (const key in HEADER_ALIASES) {
                if (HEADER_ALIASES[key as keyof typeof HEADER_ALIASES].map(a => normalizeHeader(a)).includes(normalized)) {
                  return {
                    key: key as keyof Asset,
                    label: header,
                    table: ['S/N', 'DESCRIPTION', 'ASSET ID CODE', 'ASSIGNEE', 'VERIFIED STATUS'].includes(normalized), // Default to showing these in table
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

    
