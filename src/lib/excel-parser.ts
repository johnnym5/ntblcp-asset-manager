
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
 * Finds the row index of the headers in a sheet.
 * It looks for a row with a high concentration of known header names.
 * @param sheetData The sheet data as an array of arrays.
 * @returns The index of the header row, or -1 if not found.
 */
const findHeaderRowIndex = (sheetData: any[][]): number => {
    // A list of common, high-confidence headers to identify the header row.
    const headerIndicators = ['S/N', 'DESCRIPTION', 'ASSET DESCRIPTION', 'SERIAL NUMBER', 'ASSET SERIAL NUMBERS', 'LOCATION', 'STATE', 'ASSET ID CODE', 'TAG NUMBERS'];

    for (let i = 0; i < Math.min(sheetData.length, 20); i++) {
        const row = sheetData[i];
        if (!Array.isArray(row)) continue;

        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedRow.filter(h => headerIndicators.includes(h)).length;
        
        // If we find at least two of our indicators, we can be confident this is the header row.
        if (matchCount >= 2) {
            return i;
        }
    }
    return -1; // No header row found
};


const HEADER_ALIASES: { [key in keyof Partial<Asset>]: string[] } = {
  sn: ['S/N'],
  description: ['DESCRIPTION', 'ASSET DESCRIPTION'],
  location: ['LOCATION', 'STATE', 'SITE'],
  lga: ['LGA'],
  assignee: ['ASSIGNEE'],
  assetIdCode: ['ASSET ID CODE', 'TAG NUMBERS', 'ASSET TAG', 'ASSET ID'],
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
    const { enabledSheets } = appSettings;
    const newAssets: Asset[] = [];
    const errors: string[] = [];

    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

        const sheetNamesToProcess = singleSheetName ? [singleSheetName] : workbook.SheetNames;

        for (const sheetName of sheetNamesToProcess) {
            
            // Find the canonical sheet name from settings that this sheet might match
            const canonicalSheetName = singleSheetName ?? enabledSheets.find(s => sheetName.toLowerCase().includes(s.toLowerCase()));
            
            if (!canonicalSheetName) {
                // If importing all sheets, we just skip ones that don't match any definition.
                // If importing a single sheet and it's not found, we handle it later.
                if(!singleSheetName) continue;
            }

            // Find the actual sheet name in the workbook that matches, accommodating for variations.
            const actualSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes((canonicalSheetName || sheetName).toLowerCase()));

            if (!actualSheetName) {
                errors.push(`Could not find a sheet in the workbook matching the name: "${canonicalSheetName || sheetName}".`);
                continue;
            }

            if (!enabledSheets.includes(canonicalSheetName!)) {
                // Silently skip sheets that are not enabled in settings
                continue;
            }

            const sheet = workbook.Sheets[actualSheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            
            const headerRowIndex = findHeaderRowIndex(sheetData);

            if (headerRowIndex === -1) {
                errors.push(`Could not find a valid header row in sheet: "${actualSheetName}". Skipping.`);
                continue;
            }
            
            const headerRow = sheetData[headerRowIndex];
            const jsonData = sheetData.slice(headerRowIndex + 1);

            for (const row of jsonData) {
                if (row.every(cell => cell === null || String(cell).trim() === '')) continue; // Skip entirely empty rows

                const assetObject: Partial<Asset> = { category: canonicalSheetName };
                let hasData = false;
                
                headerRow.forEach((rawHeader, colIndex) => {
                    const normalizedHeader = normalizeHeader(rawHeader);
                    const fieldName = COLUMN_TO_ASSET_FIELD_MAP.get(normalizedHeader);
                    
                    if (fieldName) {
                        // Prioritize the formatted text (.w), fall back to the raw value (.v)
                        const cell = sheet.hasOwnProperty(XLSX.utils.encode_cell({c: colIndex, r: headerRowIndex + 1 + jsonData.indexOf(row)})) 
                            ? sheet[XLSX.utils.encode_cell({c: colIndex, r: headerRowIndex + 1 + jsonData.indexOf(row)})]
                            : null;
                        
                        const cellValue = cell?.w ?? cell?.v ?? row[colIndex];

                        const finalValue = cellValue !== null ? String(cellValue).trim() : null;

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
            errors.push(`No data found to import. Please check if your Excel sheet names are similar to the enabled sheets in Settings: ${enabledSheets.join(', ')}`);
        }
    } catch (e) {
        console.error("Error parsing Excel file:", e);
        errors.push(e instanceof Error ? e.message : "An unknown error occurred during parsing.");
    }
    
    return { assets: newAssets, updatedAssets: [], skipped: 0, errors };
}



// --- Core Export Logic ---
export function exportToExcel(assets: Asset[], sheetDefinitions: Record<string, any>, fileName: string): void {
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
    const headerRowIndex = findHeaderRowIndex(sheetData);

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
