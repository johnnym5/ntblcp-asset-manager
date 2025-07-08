
import * as XLSX from 'xlsx';
import type { Asset } from './types';
import { TARGET_SHEETS, HEADER_DEFINITIONS } from './constants';
import { v4 as uuidv4 } from 'uuid';

/**
 * Checks if a given row is a header row based on expected header keywords.
 * @param rowData An array of strings representing a row.
 * @param sheetName The name of the sheet to get expected headers from constants.
 * @returns True if the row is likely a header, false otherwise.
 */
function isHeaderRow(rowData: any[], sheetName: string): boolean {
    const expectedHeaders = HEADER_DEFINITIONS[sheetName];
    if (!expectedHeaders) return false;

    const rowStrings = rowData.map(cell => String(cell ?? '').trim().toLowerCase());
    const nonEmptyCells = rowStrings.filter(c => c).length;

    // A header must have at least 3 non-empty cells to be considered.
    if (nonEmptyCells < 3) return false;

    let matchCount = 0;
    const lowerCaseExpected = expectedHeaders.map(h => h.toLowerCase().trim());

    for (const cell of rowStrings) {
        if (cell && lowerCaseExpected.includes(cell)) {
            matchCount++;
        }
    }

    // A row is considered a header if it has at least 3 direct matches or a high percentage of matches.
    // This handles variations and ensures we don't misinterpret data as headers.
    const hasKeyFields = ['s/n', 'description', 'serial'].reduce((acc, key) => {
        return acc + (rowStrings.join(' ').toLowerCase().includes(key) ? 1 : 0);
    }, 0) >= 2;

    return matchCount >= 3 && hasKeyFields;
}


/**
 * Normalizes different header names to a consistent key.
 */
function getColumnValue(row: any, ...possibleKeys: string[]): string {
    for (const key of possibleKeys) {
        const lowerKey = key.toLowerCase().replace(/\s+/g, ' ');
        for(const rowKey in row) {
            if(rowKey.toLowerCase().trim().replace(/\s+/g, ' ') === lowerKey) {
                const value = row[rowKey];
                // Handle Excel date serial numbers
                if (typeof value === 'number' && value > 10000 && lowerKey.includes('date')) {
                  const date = XLSX.SSF.parse_date_code(value);
                  return new Date(date.y, date.m - 1, date.d).toLocaleDateString('en-CA');
                }
                return String(value ?? '');
            }
        }
    }
    return '';
}

/**
 * Maps a row of data to a normalized Asset object.
 * @param row The raw data object for a single row.
 * @param category The category (sheet name) of the asset.
 * @returns A normalized Asset object, or null if essential data is missing.
 */
function mapRowToAsset(row: any, category: string): Asset | null {
    const description = getColumnValue(row, 'Asset Description', 'DESCRIPTION');

    if (!description) {
        return null; // Skip row if essential data (description) is missing
    }

    // For IHVN sheet, location can be in STATE or LOCATION column. Prioritize STATE.
    const location = category === 'IHVN-GF N-THRIP'
        ? getColumnValue(row, 'STATE', 'Location', 'LOCATION')
        : getColumnValue(row, 'Location', 'LOCATION', 'State');

    const asset: Asset = {
        id: uuidv4(),
        category,
        syncStatus: 'local',
        verifiedStatus: 'Unverified',
        description: description,
        sn: getColumnValue(row, 'S/N'),
        location: location,
        lga: getColumnValue(row, 'LGA'),
        assignee: getColumnValue(row, 'Assignee'),
        assetIdCode: getColumnValue(row, 'Asset ID Code', 'TAG NUMBERS'),
        assetClass: getColumnValue(row, 'Asset Class', 'CLASSIFICATION'),
        manufacturer: getColumnValue(row, 'Manufacturer'),
        modelNumber: getColumnValue(row, 'Model Number', 'MODEL NUMBERS'),
        serialNumber: getColumnValue(row, 'Serial Number', 'ASSET SERIAL NUMBERS'),
        supplier: getColumnValue(row, 'Supplier', 'Suppliers'),
        dateReceived: getColumnValue(row, 'Date Purchased or Received', 'Date Purchased or  Received', 'YEAR OF PURCHASE'),
        condition: getColumnValue(row, 'Condition'),
        remarks: getColumnValue(row, 'Remarks', 'Comments'),
        chasisNo: getColumnValue(row, 'Chasis no'),
        engineNo: getColumnValue(row, 'Engine no'),
        qty: getColumnValue(row, 'QTY'),
        site: getColumnValue(row, 'SITE'),
        costNgn: getColumnValue(row, 'COST (NGN)'),
        priceNaira: getColumnValue(row, 'Purchase price (Naira)'),
        priceUSD: getColumnValue(row, 'Purchase Price [USD)'), // Match typo in header
        funder: getColumnValue(row, 'Funder'),
        grant: getColumnValue(row, 'GRANT'),
        usefulLifeYears: getColumnValue(row, 'Useful Life (Years)'),
        imei: getColumnValue(row, 'IMEI (TABLETS & MOBILE PHONES)'),
        grnNo: getColumnValue(row, 'Chq No / Goods Received Note No.'),
        pvNo: getColumnValue(row, 'PV No'),
        accumulatedDepreciation: {
            ngn: getColumnValue(row, 'Accumulated Depreciation (NGN)'),
            usd: getColumnValue(row, 'Accumulated Depreciation (USD)')
        },
        netBookValue: {
            ngn: getColumnValue(row, 'Net Book Value (NGN)'),
            usd: getColumnValue(row, 'Net Book Value (USD)')
        }
    };
    return asset;
}

/**
 * Parses an entire Excel file, handling multiple sheets and dynamic/multiple header rows within sheets.
 */
export async function parseExcelFile(file: File): Promise<{ assetsBySheet: { [sheetName: string]: Asset[] }, errors: string[], skippedRows: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      let assetsBySheet: { [sheetName: string]: Asset[] } = {};
      let errors: string[] = [];
      let totalSkipped = 0;

      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        workbook.SheetNames.forEach(sheetName => {
          const matchedSheetName = TARGET_SHEETS.find(target => sheetName.trim().toLowerCase().includes(target.toLowerCase()));

          if (matchedSheetName) {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
                errors.push(`Sheet "${sheetName}" is empty or could not be read.`);
                return;
            }

            const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
            
            let sheetAssets: Asset[] = [];
            let sheetSkipped = 0;
            let currentHeaders: string[] | null = null;

            for (const rowData of sheetData) {
                // If row is completely empty, skip it.
                if (!rowData || rowData.every(cell => cell === null)) continue;
                
                if (isHeaderRow(rowData, matchedSheetName)) {
                    currentHeaders = rowData.map(cell => String(cell ?? '').trim());
                    continue; // Header found, continue to next row for data
                }

                if (currentHeaders) {
                    const rowObject: { [key: string]: any } = {};
                    currentHeaders.forEach((header, index) => {
                        if (header) { // only map columns with a header name
                            rowObject[header] = rowData[index];
                        }
                    });
                    
                    const asset = mapRowToAsset(rowObject, matchedSheetName);
                    if (asset) {
                        sheetAssets.push(asset);
                    } else {
                        // Check if the row is not just empty/header-like before counting as skipped
                        if (rowData.some(cell => cell !== null)) {
                           sheetSkipped++;
                        }
                    }
                }
            }
            
            if (sheetAssets.length > 0) {
                 assetsBySheet[matchedSheetName] = (assetsBySheet[matchedSheetName] || []).concat(sheetAssets);
            }
            if (sheetSkipped > 0) {
                 totalSkipped += sheetSkipped;
            }
             if (sheetAssets.length === 0 && !Object.keys(assetsBySheet).includes(matchedSheetName)) {
                // Only report error if we found NO assets for this sheet at all.
                errors.push(`Could not find any valid header or data rows in sheet "${sheetName}".`);
            }
          }
        });
        resolve({ assetsBySheet, errors, skippedRows: totalSkipped });

      } catch (err) {
        console.error("Error parsing Excel file:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during parsing.";
        resolve({ assetsBySheet: {}, errors: [errorMessage], skippedRows: totalSkipped });
      }
    };
    reader.onerror = (err) => {
      console.error("FileReader error:", err);
      resolve({ assetsBySheet: {}, errors: ["Failed to read the file."], skippedRows: 0 });
    };
    reader.readAsArrayBuffer(file);
  });
}


const headerToAssetKeyMap: { [key: string]: keyof Asset | string } = {
    's/n': 'sn',
    'location': 'location',
    'state': 'location',
    'lga': 'lga',
    'assignee': 'assignee',
    'asset description': 'description',
    'description': 'description',
    'asset id code': 'assetIdCode',
    'tag numbers': 'assetIdCode',
    'asset class': 'assetClass',
    'classification': 'assetClass',
    'manufacturer': 'manufacturer',
    'model number': 'modelNumber',
    'model numbers': 'modelNumber',
    'serial number': 'serialNumber',
    'asset serial numbers': 'serialNumber',
    'supplier': 'supplier',
    'suppliers': 'supplier',
    'date purchased or received': 'dateReceived',
    'date purchased or  received': 'dateReceived',
    'year of purchase': 'dateReceived',
    'chq no / goods received note no.': 'grnNo',
    'pv no': 'pvNo',
    'purchase price (naira)': 'priceNaira',
    'cost (ngn)': 'costNgn',
    'purchase price [usd)': 'priceUSD',
    'funder': 'funder',
    'condition': 'condition',
    'remarks': 'remarks',
    'comments': 'remarks',
    'grant': 'grant',
    'useful life (years)': 'usefulLifeYears',
    'accumulated depreciation (ngn)': 'accumulatedDepreciation.ngn',
    'net book value (ngn)': 'netBookValue.ngn',
    'accumulated depreciation (usd)': 'accumulatedDepreciation.usd',
    'net book value (usd)': 'netBookValue.usd',
    'imei (tablets & mobile phones)': 'imei',
    'chasis no': 'chasisNo',
    'engine no': 'engineNo',
    'qty': 'qty',
    'site': 'site'
};

function getNestedValue(obj: any, path: string): any {
    if (!path || typeof path !== 'string') return undefined;
    return path.split('.').reduce((o, k) => (o && typeof o === 'object' && o[k] !== undefined) ? o[k] : undefined, obj);
}

/**
 * Exports a list of assets to an Excel file, preserving original column structures.
 */
export function exportToExcel(assets: Asset[], fileName: string): void {
  const workbook = XLSX.utils.book_new();

  const assetsByCategory = assets.reduce((acc, asset) => {
      const category = asset.category;
      if (!acc[category]) {
          acc[category] = [];
      }
      acc[category].push(asset);
      return acc;
  }, {} as Record<string, Asset[]>);

  for (const category in assetsByCategory) {
      if (Object.prototype.hasOwnProperty.call(assetsByCategory, category)) {
          const categoryAssets = assetsByCategory[category];
          const headers = HEADER_DEFINITIONS[category];

          if (!headers) {
              console.warn(`No header definition for category: ${category}. Skipping.`);
              continue;
          }

          const finalHeaders = [...headers, 'Verified Status', 'Verified Date'];

          const dataRows = categoryAssets.map(asset => {
              const row: any[] = [];
              headers.forEach(header => {
                  const cleanHeader = header.toLowerCase().trim().replace(/\s+/g, ' ');
                  const assetKeyPath = headerToAssetKeyMap[cleanHeader];
                  if (assetKeyPath) {
                      row.push(getNestedValue(asset, assetKeyPath as string) ?? '');
                  } else {
                      row.push('');
                  }
              });
              row.push(asset.verifiedStatus || 'Unverified');
              row.push(asset.verifiedDate || '');
              return row;
          });

          const dataWithHeaders = [finalHeaders, ...dataRows];
          const worksheet = XLSX.utils.aoa_to_sheet(dataWithHeaders);
          
          // Auto-fit columns
          const cols = finalHeaders.map((header, i) => ({
            wch: Math.max(...dataRows.map(r => r[i]?.toString().length), header.length) + 2
          }));
          worksheet['!cols'] = cols;

          XLSX.utils.book_append_sheet(workbook, worksheet, category.substring(0, 31));
      }
  }

  XLSX.writeFile(workbook, fileName);
}
