
import * as XLSX from 'xlsx';
import type { Asset, AppSettings, SheetDefinition } from './types';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_DEFINITIONS } from './constants';

const normalizeHeader = (header: any): string => {
    if (header === null || header === undefined) return '';
    return String(header).trim().toUpperCase().replace(/\s+/g, ' ');
};

const findHeaderRowIndex = (sheetData: any[][], definitiveHeaders: string[]): number => {
    const normalizedDefinitiveHeaders = definitiveHeaders.map(normalizeHeader);
    
    for (let i = 0; i < Math.min(sheetData.length, 20); i++) {
        const row = sheetData[i];
        if (!Array.isArray(row)) continue;

        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedDefinitiveHeaders.filter(h => normalizedRow.includes(h)).length;
        
        if (matchCount / normalizedDefinitiveHeaders.length > 0.7) {
            return i;
        }
    }
    return -1;
};

const HEADER_ALIASES: { [key in keyof Partial<Asset>]: string[] } = {
  sn: ['S/N'],
  description: ['DESCRIPTION', 'ASSET DESCRIPTION'],
  location: ['LOCATION', 'STATE'],
  lga: ['LGA'],
  site: ['SITE'],
  assignee: ['ASSIGNEE'],
  assetIdCode: ['ASSET ID CODE', 'TAG NUMBERS'],
  assetClass: ['ASSET CLASS', 'CLASSIFICATION'],
  manufacturer: ['MANUFACTURER'],
  modelNumber: ['MODEL NUMBER', 'MODEL NUMBERS'],
  serialNumber: ['SERIAL NUMBER', 'ASSET SERIAL NUMBERS'],
  supplier: ['SUPPLIER', 'SUPPLIERS'],
  dateReceived: ['DATE PURCHASED OR RECEIVED', 'DATE PURCHASED OR  RECEIVED', 'YEAR OF PURCHASE'],
  grnNo: ['CHQ NO / GOODS RECEIVED NOTE NO.'],
  pvNo: ['PV NO'],
  costNgn: ['PURCHASE PRICE (NAIRA)', 'COST (NGN)'],
  costUsd: ['PURCHASE PRICE [USD)'],
  funder: ['FUNDER'],
  condition: ['CONDITION'],
  remarks: ['REMARKS', 'COMMENTS'],
  grant: ['GRANT'],
  usefulLifeYears: ['USEFUL LIFE (YEARS)'],
  chasisNo: ['CHASIS NO'],
  engineNo: ['ENGINE NO'],
  qty: ['QTY'],
  imei: ['IMEI (TABLETS & MOBILE PHONES)'],
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
// Specific override for IHVN sheet where 'LOCATION' means LGA
COLUMN_TO_ASSET_FIELD_MAP.set('IHVN-GF N-THRIP:LOCATION', 'lga');


export const sanitizeForFirestore = <T extends object>(obj: T): T => {
    const sanitizedObj = { ...obj };
    for (const key in sanitizedObj) {
        if (sanitizedObj[key] === undefined) {
            (sanitizedObj as any)[key] = null;
        }
    }
    return sanitizedObj;
};


export async function parseExcelFile(
    fileOrBuffer: File | ArrayBuffer, 
    appSettings: AppSettings, 
    existingAssets: Asset[],
    singleSheetName?: string
): Promise<{ assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] }> {
    const { sheetDefinitions } = appSettings;
    const newAssets: Asset[] = [];
    const errors: string[] = [];

    try {
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellText: false });

        const sheetNamesToProcess = singleSheetName 
            ? [singleSheetName] 
            : Object.keys(sheetDefinitions).filter(sheetName => appSettings.enabledSheets.includes(sheetName));
        
        for (const targetSheetName of sheetNamesToProcess) {
            const definition = sheetDefinitions[targetSheetName];
            if (!definition) {
                 if(singleSheetName) errors.push(`No definition found for sheet: "${targetSheetName}".`);
                 continue;
            }

            let actualSheetName: string | undefined;
            if (singleSheetName) {
                // For single sheet import, find an exact, case-insensitive match
                const normalizedTarget = targetSheetName.toLowerCase().trim();
                actualSheetName = workbook.SheetNames.find(s => s.toLowerCase().trim() === normalizedTarget);
            } else {
                // For full workbook import, find a sheet that contains the target name
                const normalizedTarget = targetSheetName.toLowerCase().trim();
                actualSheetName = workbook.SheetNames.find(s => s.toLowerCase().trim().includes(normalizedTarget));
            }


            if (!actualSheetName) {
                const message = singleSheetName
                    ? `Could not find a sheet with the exact name: "${targetSheetName}".`
                    : `Sheet "${targetSheetName}" not found in workbook. Skipping.`;
                if (singleSheetName) errors.push(message); // Only show error for single import
                continue;
            }

            const sheet = workbook.Sheets[actualSheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            
            const headerRowIndex = findHeaderRowIndex(sheetData, definition.headers);

            if (headerRowIndex === -1) {
                errors.push(`Could not find a valid header row in sheet: "${actualSheetName}". Please ensure it matches one of the defined templates.`);
                continue;
            }
            
            const headerRow = sheetData[headerRowIndex];
            const jsonData = sheetData.slice(headerRowIndex + 1);

            for (const row of jsonData) {
                if (row.every(cell => cell === null || String(cell).trim() === '')) continue;

                const assetObject: Partial<Asset> = { category: targetSheetName };
                let hasData = false;
                
                headerRow.forEach((rawHeader, colIndex) => {
                    if (rawHeader === null || rawHeader === undefined) return;

                    const normalizedHeader = normalizeHeader(rawHeader);
                    
                    // Check for sheet-specific override first
                    let fieldName = COLUMN_TO_ASSET_FIELD_MAP.get(`${targetSheetName}:${normalizedHeader}`);
                    // Fallback to general mapping
                    if (!fieldName) {
                        fieldName = COLUMN_TO_ASSET_FIELD_MAP.get(normalizedHeader);
                    }
                    
                    if (fieldName) {
                        // Always prioritize the raw formatted text (.w) if it exists.
                        // This prevents misinterpretation of numbers/dates as booleans ("Yes").
                        const cell = row[colIndex];
                        const finalValue = (cell && typeof cell === 'object' && 'w' in cell) ? String(cell.w).trim() : (cell !== null ? String(cell).trim() : null);

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
                    newAssets.push(newAsset);
                }
            }
        }

        if (newAssets.length === 0 && errors.length === 0) {
            errors.push(`No data found to import. Check if sheet names in the file match the enabled sheets in Settings: ${appSettings.enabledSheets.join(', ')}`);
        }
    } catch (e) {
        console.error("Error parsing Excel file:", e);
        if (e instanceof Error && e.name === 'NotFoundError') {
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
        
        if (!headerArray.includes("Verified Status")) headerArray.push("Verified Status");
        if (!headerArray.includes("Verified Date")) headerArray.push("Verified Date");
        if (!headerArray.includes("Last Modified By")) headerArray.push("Last Modified By");
        if (!headerArray.includes("Last Modified Date")) headerArray.push("Last Modified Date");
        
        const sheetData = assetsByCategory[category].map(asset => {
            const row: { [key: string]: any } = {};
            headerArray.forEach(header => {
                const normalizedHeader = normalizeHeader(header);
                
                // Check for sheet-specific override first
                let assetKey = COLUMN_TO_ASSET_FIELD_MAP.get(`${category}:${normalizedHeader}`);
                // Fallback to general mapping
                if (!assetKey) {
                    assetKey = COLUMN_TO_ASSET_FIELD_MAP.get(normalizedHeader);
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
  for(const key in HEADER_DEFINITIONS) {
    HEADER_DEFINITIONS[key].headers.forEach(h => allPossibleHeaders.add(normalizeHeader(h)));
  }

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
            templates.push({
                name: sheetName,
                headers: headerRow,
                displayFields: HEADER_DEFINITIONS[sheetName]?.displayFields || []
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
