
import * as XLSX from 'xlsx';
import type { Asset } from './types';
import { TARGET_SHEETS, HEADER_DEFINITIONS } from './constants';
import { v4 as uuidv4 } from 'uuid';

/**
 * Finds the row number containing the headers in a worksheet.
 * @param worksheet The worksheet to scan.
 * @param sheetName The name of the sheet to get expected headers.
 * @returns An object with the row index and the found headers, or null.
 */
function findHeaderRow(worksheet: XLSX.WorkSheet, sheetName: string): { headerRow: number, headers: string[] } | null {
    const expectedHeaders = HEADER_DEFINITIONS[sheetName];
    if (!expectedHeaders) return null;

    const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    let bestMatch = { score: 0, row: -1, headers: [] as string[] };

    // Scan the first 15 rows to find the best header match
    for (let i = 0; i < Math.min(sheetData.length, 15); i++) {
        const rowData = sheetData[i].map(cell => String(cell).trim());
        let currentScore = 0;
        
        const lowerCaseExpected = expectedHeaders.map(h => h.toLowerCase());
        
        rowData.forEach(cell => {
            const lowerCell = cell.toLowerCase();
            if (lowerCell && lowerCaseExpected.some(expected => expected === lowerCell)) {
                currentScore++;
            }
        });
        
        // A good header row should have at least 3 of the core fields.
        const hasKeyFields = ['s/n', 'description', 'serial'].reduce((acc, key) => {
            return acc + (rowData.join(' ').toLowerCase().includes(key) ? 1 : 0);
        }, 0) >= 2;

        if (currentScore > bestMatch.score && hasKeyFields) {
            bestMatch = { score: currentScore, row: i + 1, headers: rowData };
        }
    }
    
    // Require a minimum score to be considered a valid header row
    if (bestMatch.score > 3) { 
        return { headerRow: bestMatch.row, headers: bestMatch.headers };
    }
    
    return null;
}

/**
 * Normalizes different header names to a consistent key.
 */
function getColumnValue(row: any, ...possibleKeys: string[]): string {
    for (const key of possibleKeys) {
        if (row[key]) {
            return String(row[key]);
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
    const sn = getColumnValue(row, 'S/N');

    if (!description || !sn) {
        return null; // Skip row if essential data is missing
    }

    const asset: Asset = {
        id: uuidv4(),
        category,
        syncStatus: 'local',
        description: description,
        sn: sn,
        location: getColumnValue(row, 'Location', 'LOCATION', 'State'),
        lga: getColumnValue(row, 'LGA'),
        assignee: getColumnValue(row, 'Assignee'),
        assetIdCode: getColumnValue(row, 'Asset ID Code', 'TAG NUMBERS'),
        assetClass: getColumnValue(row, 'Asset Class', 'CLASSIFICATION'),
        manufacturer: getColumnValue(row, 'Manufacturer'),
        modelNumber: getColumnValue(row, 'Model Number', 'MODEL NUMBERS'),
        serialNumber: getColumnValue(row, 'Serial Number', 'ASSET SERIAL NUMBERS'),
        supplier: getColumnValue(row, 'Supplier', 'Suppliers'),
        dateReceived: getColumnValue(row, 'Date Purchased or Received', 'YEAR OF PURCHASE'),
        condition: getColumnValue(row, 'Condition'),
        remarks: getColumnValue(row, 'Remarks', 'Comments'),
        chasisNo: getColumnValue(row, 'Chasis no'),
        engineNo: getColumnValue(row, 'Engine no'),
        originalData: row,
    };
    return asset;
}

/**
 * Parses an entire Excel file, handling multiple sheets and dynamic header rows.
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
          const matchedSheetName = TARGET_SHEETS.find(target => sheetName.trim().toLowerCase() === target.toLowerCase());

          if (matchedSheetName) {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
                errors.push(`Sheet "${sheetName}" is empty or could not be read.`);
                return;
            }

            const headerInfo = findHeaderRow(worksheet, matchedSheetName);
            if (!headerInfo) {
              errors.push(`Could not find a valid header row in sheet "${sheetName}".`);
              return;
            }
            
            const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { range: headerInfo.headerRow -1 });
            
            let sheetAssets: Asset[] = [];
            let sheetSkipped = 0;

            jsonData.forEach(row => {
                const asset = mapRowToAsset(row, matchedSheetName);
                if (asset) {
                    sheetAssets.push(asset);
                } else {
                    sheetSkipped++;
                }
            });

            if(sheetAssets.length > 0) {
                 assetsBySheet[matchedSheetName] = sheetAssets;
            }
            if(sheetSkipped > 0) {
                 totalSkipped += sheetSkipped;
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

/**
 * Exports a list of assets to an Excel file.
 */
export function exportToExcel(assets: Asset[], fileName: string): void {
  const dataToExport = assets.map(asset => {
    const flattenedAsset: Record<string, any> = {};
    for (const [key, value] of Object.entries(asset)) {
        if (key !== 'originalData' && key !== 'syncStatus' && typeof value !== 'object') {
            flattenedAsset[key] = value;
        }
    }
    // Include some of the original data for context if needed
    flattenedAsset['Original S/N'] = asset.originalData['S/N'];
    flattenedAsset['Original Description'] = asset.originalData['Asset Description'] || asset.originalData['DESCRIPTION'];

    return flattenedAsset;
  });

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
  XLSX.writeFile(workbook, fileName);
}
