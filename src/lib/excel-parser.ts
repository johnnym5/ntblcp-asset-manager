
import * as XLSX from 'xlsx';
import type { Asset } from './types';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_DEFINITIONS } from './constants';

// --- Type Definitions ---
type ColumnToFieldMap = { [key: string]: keyof Asset };

// --- Constants ---

// This map handles variations in column names across different sheets,
// mapping them to a single, canonical field in our Asset type.
const COLUMN_TO_ASSET_FIELD_MAP: ColumnToFieldMap = {
  'S/N': 'sn',
  'LOCATION': 'location', // Used in IHVN
  'STATE': 'location',     // Used in IHVN
  'LGA': 'lga',
  'ASSIGNEE': 'assignee',
  'ASSET DESCRIPTION': 'description',
  'DESCRIPTION': 'description', // Used in IHVN
  'ASSET ID CODE': 'assetIdCode',
  'TAG NUMBERS': 'assetIdCode', // Used in IHVN
  'ASSET CLASS': 'assetClass',
  'CLASSIFICATION': 'assetClass', // Used in IHVN
  'MANUFACTURER': 'manufacturer',
  'MODEL NUMBER': 'modelNumber',
  'MODEL NUMBERS': 'modelNumber', // Used in IHVN
  'SERIAL NUMBER': 'serialNumber',
  'ASSET SERIAL NUMBERS': 'serialNumber', // Used in IHVN
  'SUPPLIER': 'supplier',
  'SUPPLIERS': 'supplier',
  'DATE PURCHASED OR RECEIVED': 'dateReceived',
  'YEAR OF PURCHASE': 'dateReceived', // Used in IHVN
  'CHQ NO / GOODS RECEIVED NOTE NO.': 'grnNo',
  'PV NO': 'pvNo',
  'PURCHASE PRICE (NAIRA)': 'costNgn',
  'COST (NGN)': 'costNgn', // Used in IHVN
  'PURCHASE PRICE [USD)': 'costUsd',
  'FUNDER': 'funder',
  'CONDITION': 'condition',
  'REMARKS': 'remarks',
  'COMMENTS': 'remarks',
  'GRANT': 'grant',
  'USEFUL LIFE (YEARS)': 'usefulLifeYears',
  'QTY': 'qty',
  'IMEI (TABLETS & MOBILE PHONES)': 'imei',
  'CHASIS NO': 'chasisNo',
  'ENGINE NO': 'engineNo',
  'SITE': 'site'
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
 * Finds the header row in a sheet by matching against predefined header definitions.
 * @param sheetData The sheet data as an array of arrays.
 * @param headersToFind The list of expected headers for the sheet.
 * @returns The index of the header row, or -1 if not found.
 */
const findHeaderRowIndex = (sheetData: any[][], headersToFind: string[]): number => {
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

        const existingAssetMap = new Map<string, Asset>();
        existingAssets.forEach(asset => {
            const key = `${asset.assetIdCode || ''}-${asset.serialNumber || ''}`.toLowerCase();
            if (asset.assetIdCode || asset.serialNumber) {
                existingAssetMap.set(key, asset);
            }
        });

        for (const sheetName of workbook.SheetNames) {
            if (!enabledSheets.includes(sheetName)) {
                continue;
            }

            const sheet = workbook.Sheets[sheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
            const headersForSheet = HEADER_DEFINITIONS[sheetName];

            if (!headersForSheet) {
                errors.push(`No header definition found for sheet: ${sheetName}. Skipping.`);
                continue;
            }

            const headerRowIndex = findHeaderRowIndex(sheetData, headersForSheet);

            if (headerRowIndex === -1) {
                errors.push(`Could not find a valid header row in sheet: ${sheetName}. Skipping.`);
                continue;
            }

            const headerRow = sheetData[headerRowIndex].map(normalizeHeader);
            const dataRows = sheetData.slice(headerRowIndex + 1);

            for (const row of dataRows) {
                if (!Array.isArray(row) || row.every(cell => cell === null)) {
                    continue; // Skip truly empty rows
                }

                const assetData: Partial<Asset> = { category: sheetName };

                headerRow.forEach((header, index) => {
                    const field = COLUMN_TO_ASSET_FIELD_MAP[header];
                    if (field) {
                        const rawValue = row[index];
                        (assetData as any)[field] = rawValue !== null && rawValue !== undefined ? String(rawValue) : '';
                    }
                });

                // Skip row only if it contains no actual data beyond the category.
                const hasData = Object.entries(assetData).some(([key, value]) => key !== 'category' && value);
                if (!hasData) {
                    skipped++;
                    continue;
                }
                
                const assetIdCode = (assetData.assetIdCode || '').trim();
                const serialNumber = (assetData.serialNumber || '').trim();

                const key = `${assetIdCode}-${serialNumber}`.toLowerCase();
                const existingAsset = (assetIdCode || serialNumber) ? existingAssetMap.get(key) : undefined;

                if (existingAsset) {
                    // Update existing asset
                    const updatedAsset = { ...existingAsset, ...assetData, syncStatus: 'local' as const };
                    updatedAssets.push(updatedAsset);
                } else {
                    // Add new asset, if not locked
                    if (!lockAssetList) {
                        const newAsset: Asset = {
                            id: uuidv4(),
                            ...assetData,
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

    // Create a reverse map for exporting
    const fieldToColumnMap: { [key in keyof Asset]?: string[] } = {};
    for (const column in COLUMN_TO_ASSET_FIELD_MAP) {
        const field = COLUMN_TO_ASSET_FIELD_MAP[column];
        if (!fieldToColumnMap[field]) {
            fieldToColumnMap[field] = [];
        }
        fieldToColumnMap[field]!.push(column);
    }
    
    for (const category in assetsByCategory) {
        if (!HEADER_DEFINITIONS[category]) {
            console.warn(`No header definition for category ${category}, skipping export for this sheet.`);
            continue;
        }

        const headers = HEADER_DEFINITIONS[category];
        const sheetData = assetsByCategory[category].map(asset => {
            const row: any = {};
            for (const header of headers) {
                const normalizedHeader = normalizeHeader(header);
                const fieldName = COLUMN_TO_ASSET_FIELD_MAP[normalizedHeader];
                
                // Add verified status and date to the end of the row
                const finalAsset: Asset & { "Verified Status"?: string, "Verified Date"?: string } = {
                    ...asset,
                    "Verified Status": asset.verifiedStatus,
                    "Verified Date": asset.verifiedDate
                }

                if (fieldName) {
                    row[header] = finalAsset[fieldName] || '';
                } else if (header === "Verified Status") {
                    row[header] = finalAsset.verifiedStatus || 'Unverified';
                } else if (header === "Verified Date") {
                    row[header] = finalAsset.verifiedDate || '';
                }
            }
            return row;
        });

        // Add "Verified Status" and "Verified Date" to headers if not present
        if (!headers.includes("Verified Status")) headers.push("Verified Status");
        if (!headers.includes("Verified Date")) headers.push("Verified Date");

        const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: headers });
        const safeSheetName = category.replace(/[\/\\?*\[\]]/g, '-').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
    }

    if (workbook.SheetNames.length > 0) {
        XLSX.writeFile(workbook, fileName);
    } else {
        throw new Error("No data was available to export.");
    }
}
