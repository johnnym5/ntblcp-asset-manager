
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
 * Finds all valid header rows in a sheet by matching against predefined header definitions.
 * @param sheetData The sheet data as an array of arrays.
 * @param headersToFind The list of expected headers for the sheet.
 * @param sheetName The name of the sheet, used for special case logic.
 * @returns An array of indices for all found header rows.
 */
const findHeaderRowIndices = (sheetData: any[][], headersToFind: string[], sheetName: string): number[] => {
  const indices: number[] = [];
  if (!headersToFind || headersToFind.length === 0) return indices;

  const normalizedHeadersToFind = new Set(headersToFind.map(normalizeHeader));
  
  // Define scan depth based on sheet name
  const scanDepth = sheetName === 'IHVN-GF N-THRIP' ? 3000 : 20;

  for (let i = 0; i < Math.min(sheetData.length, scanDepth); i++) {
    const row = sheetData[i];
    if (!Array.isArray(row)) continue;

    const normalizedRowHeaders = row.map(normalizeHeader);
    const matchCount = normalizedRowHeaders.filter(h => normalizedHeadersToFind.has(h)).length;
    
    // A high match percentage suggests this is a header row.
    if (matchCount / headersToFind.length > 0.7) {
      indices.push(i);
    }
  }
  return indices;
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
        // IMPORTANT FIX: `raw: true` prevents XLSX from converting "Yes" to boolean `true`.
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: true });

        const existingAssetByIdentifiers = new Map<string, Asset>();
        existingAssets.forEach(asset => {
             const key = `${String(asset.assetIdCode || '').trim()}-${String(asset.serialNumber || '').trim()}`.toLowerCase();
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
            
            const headerRowIndices = findHeaderRowIndices(sheetData, HEADER_DEFINITIONS[canonicalSheetName] || [], canonicalSheetName);

            if (headerRowIndices.length === 0) {
                errors.push(`Could not find a valid header row in sheet: ${canonicalSheetName}. Skipping.`);
                continue;
            }
            
            let lastSeenState: string | null = null;

            for (let i = 0; i < headerRowIndices.length; i++) {
                const headerRowIndex = headerRowIndices[i];
                const headerRow = sheetData[headerRowIndex].map(normalizeHeader);
                const stateColumnIndex = headerRow.indexOf('STATE');
                
                // Data rows are between this header and the next header (or end of sheet)
                const startRow = headerRowIndex + 1;
                const endRow = i + 1 < headerRowIndices.length ? headerRowIndices[i + 1] : sheetData.length;
                const dataRows = sheetData.slice(startRow, endRow);

                for (const row of dataRows) {
                    if (!Array.isArray(row) || row.every(cell => cell === null || String(cell).trim() === '')) {
                        continue; 
                    }

                    const assetObject: Partial<Asset> = { category: canonicalSheetName };
                    let hasAnyData = false;

                    // Handle state persistence for merged cells in IHVN sheet
                    if (canonicalSheetName === 'IHVN-GF N-THRIP' && stateColumnIndex !== -1) {
                        const stateValue = row[stateColumnIndex];
                        if (stateValue && String(stateValue).trim()) {
                            lastSeenState = String(stateValue).trim();
                        }
                        if (lastSeenState) {
                            assetObject.location = lastSeenState;
                        }
                    }

                    headerRow.forEach((header, index) => {
                        const field = COLUMN_TO_ASSET_FIELD_MAP[header];
                        const cellValue = row[index];

                        // Special handling for IHVN sheet to prevent 'LOCATION' column from overwriting 'STATE'
                        if (canonicalSheetName === 'IHVN-GF N-THRIP' && header === 'LOCATION') {
                            // Do nothing, we've already set location from STATE
                        } else if (field && cellValue !== null && String(cellValue).trim() !== '') {
                            assetObject[field] = cellValue;
                            hasAnyData = true;
                        }
                    });

                    if (!hasAnyData) {
                        continue;
                    }
                    
                    const assetIdCode = String(assetObject.assetIdCode || '').trim();
                    const serialNumber = String(assetObject.serialNumber || '').trim();

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
            row["Last Modified By"] = asset.lastModifiedBy || '';
            row["Last Modified Date"] = asset.lastModified ? new Date(asset.lastModified).toLocaleString() : '';
            return row;
        });

        // Add verification and modification headers if they don't exist
        if (!exportHeaders.includes("Verified Status")) exportHeaders.push("Verified Status");
        if (!exportHeaders.includes("Verified Date")) exportHeaders.push("Verified Date");
        if (!exportHeaders.includes("Last Modified By")) exportHeaders.push("Last Modified By");
        if (!exportHeaders.includes("Last Modified Date")) exportHeaders.push("Last Modified Date");
        
        const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: exportHeaders, skipHeader: false });
        const safeSheetName = canonicalSheetName.replace(/[\\/?*[\]]/g, '-').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
    }

    if (workbook.SheetNames.length > 0) {
        XLSX.writeFile(workbook, fileName);
    } else {
        throw new Error("No data was available to export.");
    }
}
