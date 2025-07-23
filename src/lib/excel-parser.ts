
import * as XLSX from 'xlsx';
import type { Asset, AppSettings } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Normalizes a header string for reliable matching.
 * Converts to uppercase, trims whitespace, and collapses multiple spaces.
 * @param header The header string to normalize.
 * @returns The normalized header string.
 */
const normalizeHeader = (header: any): string => {
    return String(header || '').trim().toUpperCase().replace(/\s+/g, ' ');
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
    existingAssets: Asset[]
): Promise<{ assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] }> {
    const { enabledSheets } = appSettings;
    const newAssets: Asset[] = [];
    const errors: string[] = [];

    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, rawNumbers: false });

        for (const sheetName of workbook.SheetNames) {
            const canonicalSheetName = enabledSheets.find(s => s.toLowerCase() === sheetName.toLowerCase());
            
            if (!canonicalSheetName) {
                continue; // Skip sheets not in our enabled list
            }

            const sheet = workbook.Sheets[sheetName];
            // Use raw: false to get formatted strings, not raw values. This is crucial.
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
            
            const headerRowIndex = findHeaderRowIndex(sheetData);

            if (headerRowIndex === -1) {
                errors.push(`Could not find a valid header row in sheet: ${sheetName}. Skipping.`);
                continue;
            }
            
            const headers = sheetData[headerRowIndex].map(normalizeHeader);
            const dataRows = sheetData.slice(headerRowIndex + 1);

            for (const row of dataRows) {
                if (!Array.isArray(row) || row.every(cell => cell === null || String(cell).trim() === '')) {
                    continue; // Skip empty rows
                }

                const assetObject: Partial<Asset> = { category: canonicalSheetName };
                
                let hasData = false;
                headers.forEach((header, index) => {
                    const fieldName = COLUMN_TO_ASSET_FIELD_MAP[header];
                    if (fieldName) {
                        const cellValue = row[index] !== null ? String(row[index]).trim() : null;
                        if (cellValue) {
                           (assetObject as any)[fieldName] = cellValue;
                           hasData = true;
                        }
                    }
                });
                
                if (hasData) {
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
            errors.push("No data found to import. Check if sheet names in the file match the enabled sheets in Settings.");
        }
    } catch (e) {
        console.error("Error parsing Excel file:", e);
        errors.push(e instanceof Error ? e.message : "An unknown error occurred during parsing.");
    }
    
    // The simplified parser no longer updates existing assets, it only adds new ones.
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
                const field = Object.keys(COLUMN_TO_ASSET_FIELD_MAP).find(k => k === normalizedHeader);
                if (field) {
                   const assetKey = COLUMN_TO_ASSET_FIELD_MAP[field];
                   row[header] = asset[assetKey] ?? '';
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
        displayFields: [], // Let the app decide defaults
      });
    }
  }

  if (templates.length === 0) {
    throw new Error("Could not find any valid header rows in the provided Excel file.");
  }

  return templates;
}
