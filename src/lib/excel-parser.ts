
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
 * Finds all valid header rows in a sheet by matching against predefined header definitions.
 * @param sheetData The sheet data as an array of arrays.
 * @returns An array of indices for all found header rows.
 */
const findHeaderRowIndices = (sheetData: any[][]): number[] => {
    const indices: number[] = [];
    const headerIndicators = ['S/N', 'DESCRIPTION', 'ASSET DESCRIPTION'];

    for (let i = 0; i < Math.min(sheetData.length, 20); i++) {
        const row = sheetData[i];
        if (!Array.isArray(row)) continue;

        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedRow.filter(h => headerIndicators.includes(h)).length;

        if (matchCount > 0) {
            indices.push(i);
        }
    }
    return indices;
};


/**
 * Checks if there are any meaningful differences between an existing asset and imported data.
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

            const isExistingEmpty = existingValueRaw === null || existingValueRaw === undefined || String(existingValueRaw).trim() === '';
            const isImportedEmpty = importedValueRaw === null || importedValueRaw === undefined || String(importedValueRaw).trim() === '';
            if (isExistingEmpty && isImportedEmpty) {
                continue;
            }
            
            if (typedKey === 'dateReceived' && (existingValueRaw || importedValueRaw)) {
                 try {
                    const d1 = existingValueRaw ? new Date((existingValueRaw as any).toDate ? (existingValueRaw as any).toDate() : existingValueRaw) : null;
                    const d2 = importedValueRaw ? new Date(importedValueRaw as any) : null;
                    
                    if ((d1 && isNaN(d1.getTime())) || (d2 && isNaN(d2.getTime()))) {
                       // Invalid date, fall through
                    } else {
                        const d1String = d1 ? d1.toISOString().split('T')[0] : null;
                        const d2String = d2 ? d2.toISOString().split('T')[0] : null;
                        
                        if (d1String !== d2String) return true;
                        continue;
                    }
                } catch(e) { /* Fall through */ }
            }

            if (String(existingValueRaw ?? '').trim() !== String(importedValueRaw ?? '').trim()) {
                return true;
            }
        }
    }
    return false;
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

        const existingAssetByIdentifiers = new Map<string, Asset>();
        existingAssets.forEach(asset => {
             const key = `${String(asset.assetIdCode || '').trim()}-${String(asset.serialNumber || '').trim()}`.toLowerCase();
            if (key !== '-') {
                existingAssetByIdentifiers.set(key, asset);
            }
        });

        const normalizedEnabledSheets = enabledSheets.map(normalizeSheetNameForComparison);

        for (const workbookSheetName of workbook.SheetNames) {
            const normalizedSheetName = normalizeSheetNameForComparison(workbookSheetName);
            
            const matchingCanonicalName = Object.keys(sheetDefinitions).find(s => normalizeSheetNameForComparison(s) === normalizedSheetName);

            if (!matchingCanonicalName || !enabledSheets.includes(matchingCanonicalName)) {
                continue;
            }

            const canonicalSheetName = matchingCanonicalName;
            const sheet = workbook.Sheets[workbookSheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
            
            const headerRowIndices = findHeaderRowIndices(sheetData);

            if (headerRowIndices.length === 0) {
                errors.push(`Could not find a valid header row in sheet: ${canonicalSheetName}. Skipping.`);
                continue;
            }
            
            let lastSeenState: string | null = null;

            for (let i = 0; i < headerRowIndices.length; i++) {
                const headerRowIndex = headerRowIndices[i];
                const headerRow = sheetData[headerRowIndex].map(normalizeHeader);
                const stateColumnIndex = headerRow.indexOf('STATE');
                
                const startRow = headerRowIndex + 1;
                const endRow = i + 1 < headerRowIndices.length ? headerRowIndices[i + 1] : sheetData.length;
                const dataRows = sheetData.slice(startRow, endRow);

                for (const row of dataRows) {
                    if (!Array.isArray(row) || row.every(cell => cell === null || String(cell).trim() === '')) {
                        continue;
                    }

                    const assetObject: Partial<Asset> = { category: canonicalSheetName };
                    let hasAnyData = false;

                    const isIHVNSheet = canonicalSheetName.includes('IHVN');
                    if (isIHVNSheet && stateColumnIndex !== -1) {
                        const stateValue = row[stateColumnIndex];
                        if (stateValue && String(stateValue).trim()) {
                            lastSeenState = String(stateValue).trim();
                        }
                    }

                    headerRow.forEach((header, index) => {
                        const field = COLUMN_TO_ASSET_FIELD_MAP[header];
                        const cellValue = row[index];

                        if (field && cellValue !== null && String(cellValue).trim() !== '') {
                            if (isIHVNSheet && field === 'location') {
                                if (header === 'STATE') {
                                    assetObject.location = cellValue;
                                } else if (header === 'LOCATION' && !assetObject.site) {
                                    assetObject.site = cellValue;
                                }
                            } else {
                                assetObject[field] = cellValue;
                            }
                            hasAnyData = true;
                        }
                    });

                    if (isIHVNSheet && lastSeenState && !assetObject.location) {
                        assetObject.location = lastSeenState;
                    }

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
                            const newAsset: Asset = { id: uuidv4(), ...assetObject, verifiedStatus: 'Unverified', syncStatus: 'local',} as Asset;
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
                const field = COLUMN_TO_ASSET_FIELD_MAP[header];
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


export async function parseExcelForTemplate(file: File): Promise<{ name: string; headers: string[] }[]> {
  const templates: { name: string; headers: string[] }[] = [];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const headerRowIndices = findHeaderRowIndices(sheetData);

    if (headerRowIndices.length > 0) {
      // Use the first detected header row as the template
      const headerRow = sheetData[headerRowIndices[0]].map(h => String(h || '').trim()).filter(h => h);
      templates.push({
        name: sheetName,
        headers: headerRow,
      });
    }
  }

  if (templates.length === 0) {
    throw new Error("Could not find any valid header rows in the provided Excel file.");
  }

  return templates;
}
