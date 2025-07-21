
import * as XLSX from 'xlsx';
import type { Asset } from './types';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_DEFINITIONS, TARGET_SHEETS } from './constants';

// --- Type Definitions ---
type ColumnToFieldMap = { [key: string]: keyof Asset };

// This mapping connects normalized header names (uppercase, spaces for dashes) to the Asset interface fields.
const COLUMN_TO_ASSET_FIELD_MAP: ColumnToFieldMap = {
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
    'DATE PURCHASED OR  RECEIVED': 'dateReceived', // Handles extra space variant
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


// --- Helper Functions ---

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
    // Convert to string, trim whitespace, convert to uppercase, and replace multiple spaces/tabs with a single space.
    // This also handles non-breaking spaces (\\u00A0).
    return String(header || '').trim().toUpperCase().replace(/[\s\u00A0]+/g, ' ');
};

/**
 * Normalizes a sheet name for robust matching by making it lowercase and removing non-alphanumeric characters.
 * @param name The sheet name to normalize.
 * @returns The normalized sheet name.
 */
const normalizeSheetNameForComparison = (name: string): string => {
    return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Finds the header row in a sheet by matching against predefined header definitions.
 * @param sheetData The sheet data as an array of arrays.
 * @param headersToFind The list of expected headers for the sheet.
 * @returns The index of the header row, or -1 if not found.
 */
const findHeaderRowIndex = (sheetData: any[][], headersToFind: string[]): number => {
  if (!headersToFind || headersToFind.length === 0) return -1;
  const normalizedHeadersToFind = new Set(headersToFind.map(normalizeHeader));
  
  // Search only the first 20 rows for performance.
  for (let i = 0; i < Math.min(sheetData.length, 20); i++) {
    const row = sheetData[i];
    if (!Array.isArray(row)) continue;

    const normalizedRowHeaders = row.map(normalizeHeader);
    const matchCount = normalizedRowHeaders.filter(h => normalizedHeadersToFind.has(h)).length;
    
    // Consider it a match if >70% of the expected headers are found in this row.
    if (matchCount / headersToFind.length > 0.7) {
      return i;
    }
  }
  return -1;
};

/**
 * Checks if there are any meaningful differences between an existing asset and imported data.
 * This function is robust against different data types (e.g. dates vs strings).
 * @param existing The asset from the local database.
 * @param imported The partial asset data from the Excel file.
 * @returns True if there is at least one change, false otherwise.
 */
const hasChanges = (existing: Asset, imported: Partial<Asset>): boolean => {
    for (const key in imported) {
        if (Object.prototype.hasOwnProperty.call(imported, key)) {
            const typedKey = key as keyof Asset;
            
            const existingValueRaw = existing[typedKey];
            const importedValueRaw = imported[typedKey];

            // If both values are considered "empty", treat them as the same and continue.
            const isExistingEmpty = existingValueRaw === null || existingValueRaw === undefined || String(existingValueRaw).trim() === '';
            const isImportedEmpty = importedValueRaw === null || importedValueRaw === undefined || String(importedValueRaw).trim() === '';
            if (isExistingEmpty && isImportedEmpty) {
                continue;
            }
            
            // Special handling for date fields to make comparison robust
            if (typedKey === 'dateReceived' && (existingValueRaw || importedValueRaw)) {
                 try {
                    // Create Date objects, handling Firestore Timestamps and various date formats
                    const d1 = existingValueRaw ? new Date(existingValueRaw.toDate ? existingValueRaw.toDate() : existingValueRaw) : null;
                    const d2 = importedValueRaw ? new Date(importedValueRaw) : null;
                    
                    // If either is an invalid date, we can't compare them as dates. Fall through to string comparison.
                    if ((d1 && isNaN(d1.getTime())) || (d2 && isNaN(d2.getTime()))) {
                       // Fall through to string comparison below
                    } else {
                        const d1String = d1 ? d1.toISOString().split('T')[0] : null;
                        const d2String = d2 ? d2.toISOString().split('T')[0] : null;
                        
                        if (d1String !== d2String) {
                            return true;
                        }
                        continue; // Dates are the same, skip to next field
                    }
                } catch(e) {
                    // Fall through to string comparison if date parsing fails
                }
            }

            // Fallback to simple string comparison for all other fields
            if (String(existingValueRaw ?? '').trim() !== String(importedValueRaw ?? '').trim()) {
                return true;
            }
        }
    }
    return false;
};


// --- Core Parsing Logic ---

export async function parseExcelFile(
    file: File, 
    enabledSheets: string[], 
    existingAssets: Asset[],
    lockAssetList: boolean
): Promise<{ assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] }> {
    const newAssets: Asset[] = [];
    const updatedAssets: Asset[] = [];
    let skipped = 0;
    const errors: string[] = [];

    try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

        const existingAssetByIdentifiers = new Map<string, Asset>();
        existingAssets.forEach(asset => {
             const key = `${(asset.assetIdCode || '').trim()}-${(asset.serialNumber || '').trim()}`.toLowerCase();
            if (key !== '-') {
                existingAssetByIdentifiers.set(key, asset);
            }
        });

        for (const workbookSheetName of workbook.SheetNames) {
            const normalizedWorkbookSheetNameForComparison = normalizeSheetNameForComparison(workbookSheetName);
            
            const canonicalSheetName = TARGET_SHEETS.find(
                s => normalizeSheetNameForComparison(s) === normalizedWorkbookSheetNameForComparison
            );

            if (!canonicalSheetName || !enabledSheets.includes(canonicalSheetName)) {
                continue;
            }

            const sheet = workbook.Sheets[workbookSheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
            
            const headerRowIndex = findHeaderRowIndex(sheetData, HEADER_DEFINITIONS[canonicalSheetName] || []);

            if (headerRowIndex === -1 || headerRowIndex >= sheetData.length) {
                errors.push(`Could not find a valid header row in sheet: ${canonicalSheetName}. Skipping.`);
                continue;
            }
            
            const headerRow = sheetData[headerRowIndex].map(normalizeHeader);
            const dataRows = sheetData.slice(headerRowIndex + 1);

            for (const row of dataRows) {
                if (!Array.isArray(row) || row.every(cell => cell === null || String(cell).trim() === '')) {
                    continue; 
                }

                const assetObject: Partial<Asset> = { category: canonicalSheetName };
                const populatedFields = new Set<keyof Asset>();

                headerRow.forEach((header, index) => {
                    const field = COLUMN_TO_ASSET_FIELD_MAP[header];
                    const cellValue = row[index];
                    if (field && !populatedFields.has(field) && cellValue !== null && String(cellValue).trim() !== '') {
                        assetObject[field] = cellValue;
                        populatedFields.add(field);
                    }
                });

                // More flexible check: import if there's at least a description or serial number.
                if (!assetObject.description && !assetObject.serialNumber) {
                    skipped++;
                    continue;
                }
                
                const assetIdCode = (assetObject.assetIdCode || '').trim();
                const serialNumber = (assetObject.serialNumber || '').trim();

                const key = `${assetIdCode}-${serialNumber}`.toLowerCase();
                const existingAsset = (key !== '-') ? existingAssetByIdentifiers.get(key) : undefined;

                if (existingAsset) {
                    if (hasChanges(existingAsset, assetObject)) {
                        const updatedAsset = { ...existingAsset, ...assetObject, syncStatus: 'local' as const };
                        updatedAssets.push(updatedAsset);
                    }
                } else {
                    if (!lockAssetList) {
                        const newAsset: Asset = {
                            id: uuidv4(),
                            ...assetObject,
                            verifiedStatus: 'Unverified',
                            syncStatus: 'local',
                        } as Asset;
                        newAssets.push(newAsset);
                    } else {
                        skipped++;
                    }
                }
            }
        }
        if (newAssets.length === 0 && updatedAssets.length === 0 && errors.length === 0) {
            errors.push("No data found to import. Check if sheets are enabled in Settings and match the file.");
        }
    } catch (e) {
        console.error("Error parsing Excel file:", e);
        errors.push(e instanceof Error ? e.message : "An unknown error occurred during parsing.");
    }
    
    return { assets: newAssets, updatedAssets, skipped, errors };
}

// --- Core Export Logic ---

export function exportToExcel(assets: Asset[], fileName: string): void {
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
        const canonicalSheetName = TARGET_SHEETS.find(s => normalizeSheetNameForComparison(s) === normalizeSheetNameForComparison(category));
        
        if (!canonicalSheetName || !HEADER_DEFINITIONS[canonicalSheetName]) {
            console.warn(`No header definition for category ${category}, skipping export for this sheet.`);
            continue;
        }

        const exportHeaders = [...HEADER_DEFINITIONS[canonicalSheetName]];
        
        const sheetData = assetsByCategory[category].map(asset => {
            const row: { [key: string]: any } = {};
            for (const header of exportHeaders) {
                const normalizedHeader = normalizeHeader(header);
                const fieldName = Object.keys(COLUMN_TO_ASSET_FIELD_MAP).find(key => normalizeHeader(key) === normalizedHeader);
                const assetField = fieldName ? COLUMN_TO_ASSET_FIELD_MAP[fieldName] : undefined;

                if (assetField) {
                    row[header] = asset[assetField] || '';
                }
            }
            row["Verified Status"] = asset.verifiedStatus || 'Unverified';
            row["Verified Date"] = asset.verifiedDate || '';
            return row;
        });

        if (!exportHeaders.includes("Verified Status")) {
          exportHeaders.push("Verified Status");
        }
        if (!exportHeaders.includes("Verified Date")) {
          exportHeaders.push("Verified Date");
        }

        const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: exportHeaders });
        const safeSheetName = canonicalSheetName.replace(/[\\/?*[\]]/g, '-').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
    }

    if (workbook.SheetNames.length > 0) {
        XLSX.writeFile(workbook, fileName);
    } else {
        throw new Error("No data was available to export.");
    }
}
