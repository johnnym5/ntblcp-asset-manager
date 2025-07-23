
import * as XLSX from 'xlsx';
import type { Asset, AppSettings } from './types';
import { v4 as uuidv4 } from 'uuid';

// --- Helper Functions ---

/**
 * Normalizes a sheet name for robust matching by making it lowercase and removing non-alphanumeric characters.
 * @param name The sheet name to normalize.
 * @returns The normalized sheet name.
 */
const normalizeSheetNameForComparison = (name: string): string => {
    return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
};


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


/**
 * Normalizes a header string for reliable matching.
 * @param header The header string to normalize.
 * @returns The normalized header string.
 */
const normalizeHeader = (header: any): string => {
    return String(header || '').trim().toUpperCase().replace(/[\s\u00A0]+/g, ' ');
};

/**
 * Finds the first valid header row in a sheet by matching against a list of common header indicators.
 * @param sheetData The sheet data as an array of arrays.
 * @returns The index of the header row, or -1 if not found.
 */
const findHeaderRowIndex = (sheetData: any[][]): number => {
    // A list of common, high-confidence headers to identify the header row.
    const headerIndicators = ['S/N', 'DESCRIPTION', 'ASSET DESCRIPTION', 'SERIAL NUMBER', 'ASSET SERIAL NUMBERS', 'LOCATION', 'STATE'];

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

const COLUMN_TO_ASSET_FIELD_MAP: { [key: string]: keyof Asset } = {
    'S/N': 'sn',
    'DESCRIPTION': 'description',
    'ASSET DESCRIPTION': 'description',
    'LOCATION': 'location',
    'STATE': 'location',
    'LGA': 'lga',
    'ASSIGNEE': 'assignee',
    'ASSET ID CODE': 'assetIdCode',
    'TAG NUMBERS': 'assetIdCode',
    'ASSET CLASS': 'assetClass',
    'CLASSIFICATION': 'assetClass',
    'MANUFACTURER': 'manufacturer',
    'MODEL NUMBER': 'modelNumber',
    'MODEL NUMBERS': 'modelNumber',
    'SERIAL NUMBER': 'serialNumber',
    'ASSET SERIAL NUMBERS': 'serialNumber',
    'SUPPLIER': 'supplier',
    'SUPPLIERS': 'supplier',
    'DATE PURCHASED OR RECEIVED': 'dateReceived',
    'DATE PURCHASED OR  RECEIVED': 'dateReceived',
    'YEAR OF PURCHASE': 'dateReceived',
    'CHQ NO / GOODS RECEIVED NOTE NO.': 'grnNo',
    'PV NO': 'pvNo',
    'PURCHASE PRICE (NAIRA)': 'costNgn',
    'COST (NGN)': 'costNgn',
    'PURCHASE PRICE [USD)': 'costUsd',
    'FUNDER': 'funder',
    'CONDITION': 'condition',
    'REMARKS': 'remarks',
    'COMMENTS': 'remarks',
    'GRANT': 'grant',
    'USEFUL LIFE (YEARS)': 'usefulLifeYears',
    'CHASIS NO': 'chasisNo',
    'ENGINE NO': 'engineNo',
    'QTY': 'qty',
    'SITE': 'site',
    'IMEI (TABLETS & MOBILE PHONES)': 'imei',
};


// --- Core Parsing Logic ---

export async function parseExcelFile(
    file: File, 
    appSettings: AppSettings, 
    existingAssets: Asset[]
): Promise<{ assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] }> {
    const { enabledSheets, lockAssetList, sheetDefinitions } = appSettings;
    const newAssets: Asset[] = [];
    const updatedAssets: Asset[] = [];
    let skipped = 0;
    const errors: string[] = [];

    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: true, defval: null });

        // A map to quickly find existing assets to prevent duplicates.
        const existingAssetByIdentifiers = new Map<string, Asset>();
        existingAssets.forEach(asset => {
             const key = `${String(asset.assetIdCode || '').trim()}-${String(asset.serialNumber || '').trim()}`.toLowerCase();
            if (key !== '-') {
                existingAssetByIdentifiers.set(key, asset);
            }
        });

        for (const workbookSheetName of workbook.SheetNames) {
            const normalizedSheetName = normalizeSheetNameForComparison(workbookSheetName);
            
            // Find the canonical sheet name from settings that matches the current sheet.
            const matchingCanonicalName = Object.keys(sheetDefinitions).find(s => normalizeSheetNameForComparison(s) === normalizedSheetName);

            // Skip if the sheet is not in our list of enabled sheets.
            if (!matchingCanonicalName || !enabledSheets.includes(matchingCanonicalName)) {
                continue;
            }

            const sheet = workbook.Sheets[workbookSheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
            
            const headerRowIndex = findHeaderRowIndex(sheetData);

            if (headerRowIndex === -1) {
                errors.push(`Could not find a valid header row in sheet: ${matchingCanonicalName}. Skipping.`);
                continue;
            }
            
            const headerRow = sheetData[headerRowIndex].map(normalizeHeader);
            const dataRows = sheetData.slice(headerRowIndex + 1);

            for (const row of dataRows) {
                // Skip empty rows
                if (!Array.isArray(row) || row.every(cell => cell === null || String(cell).trim() === '')) {
                    continue;
                }

                const assetObject: Partial<Asset> = { category: matchingCanonicalName };

                // Map data from each cell in the row to the corresponding asset field based on the header.
                headerRow.forEach((header, index) => {
                    const field = COLUMN_TO_ASSET_FIELD_MAP[header];
                    const cellValue = row[index];

                    if (field && cellValue !== null && String(cellValue).trim() !== '') {
                        assetObject[field] = cellValue;
                    }
                });

                // If the row contained no mappable data, skip it.
                if (Object.keys(assetObject).length <= 1) { // Only contains 'category'
                    continue;
                }
                
                // For now, we are just creating new assets from every row. 
                // The logic to check for existing assets can be added back here if needed.
                const newAsset: Asset = { 
                    id: uuidv4(), 
                    ...assetObject, 
                    verifiedStatus: 'Unverified',
                } as Asset;

                newAssets.push(newAsset);
            }
        }
        if (newAssets.length === 0 && updatedAssets.length === 0 && errors.length === 0) {
            errors.push("No data found to import. Check if sheet names in the file match the enabled sheets in Settings.");
        }
    } catch (e) {
        console.error("Error parsing Excel file:", e);
        errors.push(e instanceof Error ? e.message : "An unknown error occurred during parsing.");
    }
    
    return { assets: newAssets, updatedAssets, skipped, errors };
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
        const headerArray = definition ? [...definition.headers] : Object.keys(COLUMN_TO_ASSET_FIELD_MAP);
        
        // Ensure verification columns are added
        if (!headerArray.includes("Verified Status")) headerArray.push("Verified Status");
        if (!headerArray.includes("Verified Date")) headerArray.push("Verified Date");
        if (!headerArray.includes("Last Modified By")) headerArray.push("Last Modified By");
        if (!headerArray.includes("Last Modified Date")) headerArray.push("Last Modified Date");
        
        const sheetData = assetsByCategory[category].map(asset => {
            const row: { [key: string]: any } = {};
            headerArray.forEach(header => {
                const normalizedHeader = normalizeHeader(header);
                const field = COLUMN_TO_ASSET_FIELD_MAP[normalizedHeader];
                if (field) {
                   row[header] = asset[field] ?? '';
                }
            });
            row["Verified Status"] = asset.verifiedStatus || 'Unverified';
            row["Verified Date"] = asset.verifiedDate || '';
            row["Last Modified By"] = asset.lastModifiedBy || '';
            row["Last Modified Date"] = asset.lastModified ? new Date(asset.lastModified).toLocaleString() : '';
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


export async function parseExcelForTemplate(file: File): Promise<{ name: string; headers: string[], displayFields: (keyof Asset)[] }[]> {
  const templates: { name: string; headers: string[], displayFields: (keyof Asset)[] }[] = [];
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
        displayFields: ['sn', 'description', 'assetIdCode', 'assignee', 'verifiedStatus', 'lastModified'],
      });
    }
  }

  if (templates.length === 0) {
    throw new Error("Could not find any valid header rows in the provided Excel file.");
  }

  return templates;
}
