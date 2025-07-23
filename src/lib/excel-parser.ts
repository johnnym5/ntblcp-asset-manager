
import * as XLSX from 'xlsx';
import type { Asset, AppSettings, SheetDefinition } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Normalizes a header string for reliable matching.
 * Converts to uppercase, trims whitespace, and collapses multiple spaces.
 * @param header The header string to normalize.
 * @returns The normalized header string.
 */
const normalizeHeader = (header: any): string => {
    if (header === null || header === undefined) return '';
    return String(header).trim().toUpperCase().replace(/\s+/g, ' ');
};

/**
 * Finds the row index of the headers in a sheet by matching against a definitive list.
 * @param sheetData The sheet data as an array of arrays.
 * @param definitiveHeaders The list of headers that MUST be present.
 * @returns The index of the header row, or -1 if not found.
 */
const findHeaderRowIndex = (sheetData: any[][], definitiveHeaders: string[]): number => {
    const normalizedDefinitiveHeaders = definitiveHeaders.map(normalizeHeader);
    
    for (let i = 0; i < Math.min(sheetData.length, 20); i++) {
        const row = sheetData[i];
        if (!Array.isArray(row)) continue;

        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedDefinitiveHeaders.filter(h => normalizedRow.includes(h)).length;
        
        // Require a high confidence match (e.g., >70% of the defined headers)
        if (matchCount / normalizedDefinitiveHeaders.length > 0.7) {
            return i;
        }
    }
    return -1; // No header row found
};

// This alias map is now the single source of truth for mapping various Excel
// header names to a single, consistent field in the Asset object.
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

// Create a reverse map for faster lookups: from excel header to asset field key
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
 * Replaces undefined values with null in an object, which is compatible with Firestore.
 * @param obj The object to sanitize.
 * @returns A new object with undefined values replaced by null.
 */
export const sanitizeForFirestore = <T extends object>(obj: T): T => {
    const sanitizedObj = { ...obj };
    for (const key in sanitizedObj) {
        if (sanitizedObj[key] === undefined) {
            (sanitizedObj as any)[key] = null;
        }
    }
    return sanitizedObj;
};


// --- CORE PARSING LOGIC ---
export async function parseExcelFile(
    file: File, 
    appSettings: AppSettings, 
    existingAssets: Asset[],
    singleSheetName?: string
): Promise<{ assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] }> {
    const { sheetDefinitions } = appSettings;
    const newAssets: Asset[] = [];
    const errors: string[] = [];

    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

        const sheetNamesToProcess = singleSheetName ? [singleSheetName] : Object.keys(sheetDefinitions);
        
        for (const targetSheetName of sheetNamesToProcess) {
            const definition = sheetDefinitions[targetSheetName];
            if (!definition) {
                 if(singleSheetName) errors.push(`No definition found for sheet: "${targetSheetName}".`);
                 continue; // Skip if no definition exists
            }

            // Find the actual sheet in the workbook by checking if the workbook sheet name CONTAINS the target name
            const actualSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes(targetSheetName.toLowerCase()));

            if (!actualSheetName) {
                if(singleSheetName) errors.push(`Could not find a sheet in the workbook matching: "${targetSheetName}".`);
                continue;
            }

            const sheet = workbook.Sheets[actualSheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            
            const headerRowIndex = findHeaderRowIndex(sheetData, definition.headers);

            if (headerRowIndex === -1) {
                errors.push(`Could not find a valid header row in sheet: "${actualSheetName}". Please ensure it matches the defined headers.`);
                continue;
            }
            
            const headerRow = sheetData[headerRowIndex];
            const jsonData = sheetData.slice(headerRowIndex + 1);

            for (const row of jsonData) {
                if (row.every(cell => cell === null || String(cell).trim() === '')) continue; // Skip entirely empty rows

                const assetObject: Partial<Asset> = { category: targetSheetName };
                let hasData = false;
                
                headerRow.forEach((rawHeader, colIndex) => {
                    if (rawHeader === null || rawHeader === undefined) return;

                    const normalizedHeader = normalizeHeader(rawHeader);
                    const fieldName = COLUMN_TO_ASSET_FIELD_MAP.get(normalizedHeader);
                    
                    if (fieldName) {
                        const cellValue = row[colIndex];
                        const finalValue = cellValue !== null && cellValue !== undefined ? String(cellValue).trim() : null;

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
            errors.push(`No data found to import. Check if sheet names in the file match the enabled sheets in Settings: ${Object.keys(sheetDefinitions).join(', ')}`);
        }
    } catch (e) {
        console.error("Error parsing Excel file:", e);
        errors.push(e instanceof Error ? e.message : "An unknown error occurred during parsing.");
    }
    
    return { assets: newAssets, updatedAssets: [], skipped: 0, errors };
}



// --- Core Export Logic ---
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

        const headerArray = definition.headers?.length > 0 ? [...definition.headers] : [];
        if (headerArray.length === 0) continue; // Don't export sheets with no defined headers
        
        // Ensure verification columns are added
        if (!headerArray.includes("Verified Status")) headerArray.push("Verified Status");
        if (!headerArray.includes("Verified Date")) headerArray.push("Verified Date");
        if (!headerArray.includes("Last Modified By")) headerArray.push("Last Modified By");
        if (!headerArray.includes("Last Modified Date")) headerArray.push("Last Modified Date");
        
        const sheetData = assetsByCategory[category].map(asset => {
            const row: { [key: string]: any } = {};
            headerArray.forEach(header => {
                const normalizedHeader = normalizeHeader(header);
                
                // Find the key in the map that matches the normalized header
                const assetKey = COLUMN_TO_ASSET_FIELD_MAP.get(normalizedHeader);
                
                if (assetKey) {
                   row[header] = asset[assetKey] ?? '';
                } else {
                   // Handle special cases not in the map
                   if (normalizedHeader === 'VERIFIED STATUS') row[header] = asset.verifiedStatus || 'Unverified';
                   else if (normalizedHeader === 'VERIFIED DATE') row[header] = asset.verifiedDate || '';
                   else if (normalizedHeader === 'LAST MODIFIED BY') row[header] = asset.lastModifiedBy || '';
                   else if (normalizedHeader === 'LAST MODIFIED DATE') row[header] = asset.lastModified ? new Date(asset.lastModified).toLocaleString() : '';
                   else row[header] = ''; // Default for unknown headers
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

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const headerRowIndex = findHeaderRowIndex(sheetData, []); // Pass empty array to just find *a* header row

    if (headerRowIndex !== -1) {
      // Use the first detected header row as the template
      const headerRow = sheetData[headerRowIndex].map(h => String(h || '').trim()).filter(h => h);
      templates.push({
        name: sheetName,
        headers: headerRow,
        displayFields: [], // Let the app decide defaults
      });
    }
  }

  if (templates.length === 0) {
    throw new Error("Could not find any valid header rows in the provided Excel file.");
  }

  return templates;
}
