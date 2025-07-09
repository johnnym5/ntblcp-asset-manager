
import * as XLSX from 'xlsx';
import type { Asset } from './types';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_DEFINITIONS, TARGET_SHEETS, COLUMN_TO_ASSET_FIELD_MAP } from './constants';

// --- Type Definitions ---
type ColumnToFieldMap = { [key: string]: keyof Asset };

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
            if (asset.assetIdCode || asset.serialNumber) {
                existingAssetByIdentifiers.set(key, asset);
            }
        });

        for (const workbookSheetName of workbook.SheetNames) {
            // Apply the new, more robust normalization for comparison
            const normalizedWorkbookSheetNameForComparison = normalizeSheetNameForComparison(workbookSheetName);

            const canonicalSheetName = TARGET_SHEETS.find(
                s => normalizeSheetNameForComparison(s) === normalizedWorkbookSheetNameForComparison
            );

            if (!canonicalSheetName || !enabledSheets.includes(canonicalSheetName)) {
                continue;
            }

            const sheet = workbook.Sheets[workbookSheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
            const headersForSheet = HEADER_DEFINITIONS[canonicalSheetName];

            if (!headersForSheet) {
                errors.push(`No header definition found for sheet: ${canonicalSheetName}. Skipping.`);
                continue;
            }
            
            let headerRowIndex;
            if (canonicalSheetName === 'NTBLCP-TB-FAR') {
                headerRowIndex = 6; // The 7th row is index 6
            } else {
                headerRowIndex = findHeaderRowIndex(sheetData, headersForSheet);
            }

            if (headerRowIndex === -1 || headerRowIndex >= sheetData.length) {
                errors.push(`Could not find a valid header row in sheet: ${canonicalSheetName}. Skipping.`);
                continue;
            }
            
            const headerRow = sheetData[headerRowIndex].map(normalizeHeader);
            const dataRows = sheetData.slice(headerRowIndex + 1);

            for (const row of dataRows) {
                if (!Array.isArray(row) || row.every(cell => cell === null || String(cell).trim() === '')) {
                    continue; // Skip truly empty rows
                }

                const assetData: Partial<Asset> = { category: canonicalSheetName };

                // Use a set to track which asset fields have already been populated to avoid overwriting with blank duplicated columns.
                const populatedFields = new Set<keyof Asset>();

                headerRow.forEach((header, index) => {
                    const field = COLUMN_TO_ASSET_FIELD_MAP[header];
                    // Only process if the field exists, a value exists in the cell,
                    // and this specific asset field hasn't been filled yet.
                    if (field && !populatedFields.has(field) && row[index] !== null && String(row[index]).trim() !== '') {
                        assetData[field] = String(row[index]);
                        populatedFields.add(field); // Mark this field as populated for the current row.
                    }
                });

                // Skip if no actual asset data was extracted.
                if (Object.keys(assetData).length <= 1) { // <=1 because 'category' is always present
                    skipped++;
                    continue;
                }
                
                const assetIdCode = (assetData.assetIdCode || '').trim();
                const serialNumber = (assetData.serialNumber || '').trim();

                const key = `${assetIdCode}-${serialNumber}`.toLowerCase();
                const existingAsset = (assetIdCode || serialNumber) ? existingAssetByIdentifiers.get(key) : undefined;

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
                const fieldName = COLUMN_TO_ASSET_FIELD_MAP[normalizedHeader];
                
                if (fieldName) {
                    row[header] = asset[fieldName] || '';
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
