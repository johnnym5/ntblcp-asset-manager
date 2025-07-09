
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
 * Normalizes a header string by converting to uppercase and trimming whitespace.
 * @param header The header string to normalize.
 * @returns The normalized header string.
 */
const normalizeHeader = (header: any): string => {
  return String(header || '').trim().toUpperCase().replace(/\s+/g, ' ');
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
        const workbook = XLSX.read(buffer, { type: 'array' });

        const existingAssetByIdentifiers = new Map<string, Asset>();
        existingAssets.forEach(asset => {
             const key = `${asset.assetIdCode || ''}-${asset.serialNumber || ''}`.toLowerCase();
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
            // Read sheet as an array of arrays for robust parsing
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
            
            let headerRowIndex;
            // Apply special rule for NTBLCP-TB-FAR sheet
            if (canonicalSheetName === 'NTBLCP-TB-FAR') {
                headerRowIndex = 6; // 7th row
            } else {
                headerRowIndex = findHeaderRowIndex(sheetData, HEADER_DEFINITIONS[canonicalSheetName] || []);
            }

            if (headerRowIndex === -1 || headerRowIndex >= sheetData.length) {
                errors.push(`Could not find a valid header row in sheet: ${canonicalSheetName}. Skipping.`);
                continue;
            }
            
            const headerRow = sheetData[headerRowIndex].map(normalizeHeader);
            const dataRows = sheetData.slice(headerRowIndex + 1);

            for (const row of dataRows) {
                // This check prevents crashes from empty/malformed rows
                if (!Array.isArray(row) || row.every(cell => cell === null || String(cell).trim() === '')) {
                    skipped++;
                    continue; 
                }

                const assetObject: Partial<Asset> = { category: canonicalSheetName };
                const populatedFields = new Set<keyof Asset>();

                headerRow.forEach((header, index) => {
                    const field = COLUMN_TO_ASSET_FIELD_MAP[header];
                    // Only process if the field exists, a value exists in the cell,
                    // and this specific asset field hasn't been filled yet.
                    if (field && !populatedFields.has(field) && row[index] !== null && String(row[index]).trim() !== '') {
                        assetObject[field] = String(row[index]);
                        populatedFields.add(field); // Mark this field as populated for the current row.
                    }
                });

                // Skip if no actual asset data was extracted (only category is present).
                if (Object.keys(assetObject).length <= 1) {
                    skipped++;
                    continue;
                }
                
                const assetIdCode = (assetObject.assetIdCode || '').trim();
                const serialNumber = (assetObject.serialNumber || '').trim();

                const key = `${assetIdCode}-${serialNumber}`.toLowerCase();
                const existingAsset = (key !== '-') ? existingAssetByIdentifiers.get(key) : undefined;

                if (existingAsset) {
                    // Update existing asset
                    const updatedAsset = { ...existingAsset, ...assetObject, syncStatus: 'local' as const };
                    updatedAssets.push(updatedAsset);
                } else {
                    // Add new asset, if not locked
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
        const canonicalSheetName = TARGET_SHEETS.find(s => s === category);
        if (!canonicalSheetName || !HEADER_DEFINITIONS[canonicalSheetName]) {
            console.warn(`No header definition for category ${category}, skipping export for this sheet.`);
            continue;
        }

        const exportHeaders = [...HEADER_DEFINITIONS[canonicalSheetName]];
        
        const sheetData = assetsByCategory[category].map(asset => {
            const row: { [key: string]: any } = {};
            for (const header of exportHeaders) {
                const normalizedHeader = normalizeHeader(header);
                // Find the first field name that maps to this header
                const fieldName = Object.keys(COLUMN_TO_ASSET_FIELD_MAP).find(key => normalizeHeader(key) === normalizedHeader);
                const assetField = fieldName ? COLUMN_TO_ASSET_FIELD_MAP[fieldName] : undefined;

                if (assetField) {
                    row[header] = asset[assetField] || '';
                }
            }
            // Manually add verified status and date at the end
            row["Verified Status"] = asset.verifiedStatus || 'Unverified';
            row["Verified Date"] = asset.verifiedDate || '';
            return row;
        });

        // Add "Verified Status" and "Verified Date" to headers for export
        if (!exportHeaders.includes("Verified Status")) {
          exportHeaders.push("Verified Status");
        }
        if (!exportHeaders.includes("Verified Date")) {
          exportHeaders.push("Verified Date");
        }

        const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: exportHeaders });
        const safeSheetName = canonicalSheetName.replace(/[\/\\?*\[\]]/g, '-').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
    }

    if (workbook.SheetNames.length > 0) {
        XLSX.writeFile(workbook, fileName);
    } else {
        throw new Error("No data was available to export.");
    }
}
