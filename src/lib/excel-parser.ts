
import * as XLSX from 'xlsx';
import type { Asset } from './types';
import { HEADER_DEFINITIONS } from './constants';
import { v4 as uuidv4 } from 'uuid';

function isHeaderRow(rowData: any[], sheetName: string): boolean {
    const expectedHeaders = HEADER_DEFINITIONS[sheetName];
    if (!expectedHeaders) return false;

    const rowStrings = rowData.map(cell => String(cell ?? '').trim().toLowerCase());
    const nonEmptyCells = rowStrings.filter(c => c).length;

    if (nonEmptyCells < 2) return false;

    let matchCount = 0;
    const lowerCaseExpected = expectedHeaders.map(h => h.toLowerCase().trim());

    for (const cell of rowStrings) {
        if (cell && lowerCaseExpected.includes(cell)) {
            matchCount++;
        }
    }
    
    // Consider it a header if it has at least 3 matching known columns,
    // or if it contains key identifying text.
    const hasKeyFields = ['description', 'serial', 'asset id', 'chasis', 'engine no'].some(key => 
        rowStrings.join(' ').includes(key)
    );

    return matchCount >= 3 || hasKeyFields;
}


function getColumnValue(row: any, ...possibleKeys: string[]): string {
    for (const key of possibleKeys) {
        const lowerKey = key.toLowerCase().trim().replace(/\s+/g, ' ');
        for(const rowKey in row) {
            const lowerRowKey = rowKey.toLowerCase().trim().replace(/\s+/g, ' ');
            if(lowerRowKey === lowerKey) {
                const value = row[rowKey];
                if (typeof value === 'number' && (lowerKey.includes('date') || lowerKey.includes('year'))) {
                  // Handle Excel date serial numbers
                  if (value > 20000) { // Arbitrary number to distinguish from simple years
                    const date = XLSX.SSF.parse_date_code(value);
                    return new Date(date.y, date.m - 1, date.d).toLocaleDateString('en-CA');
                  }
                }
                return String(value ?? '');
            }
        }
    }
    return '';
}

function mapRowToAsset(row: any, category: string, existingAsset?: Asset): Asset {
    const description = getColumnValue(row, 'Asset Description', 'DESCRIPTION');
    const assetIdCode = getColumnValue(row, 'Asset ID Code', 'TAG NUMBERS');
    const serialNumber = getColumnValue(row, 'Serial Number', 'ASSET SERIAL NUMBERS');
    const chasisNo = getColumnValue(row, 'Chasis no');
    const engineNo = getColumnValue(row, 'Engine no');
    const condition = getColumnValue(row, 'Condition');
    const remarks = getColumnValue(row, 'Remarks', 'Comments');
    
    let assignee = getColumnValue(row, 'Assignee');
    if (assignee.toLowerCase() === 'yes' || assignee.toLowerCase() === 'no') {
        assignee = '';
    }

    // Sheet-specific logic for ambiguous fields like location/site
    let location = '';
    let site = '';
    let lga = '';
    
    if (category === 'IHVN-GF N-THRIP') {
        location = getColumnValue(row, 'STATE'); // In this sheet, 'STATE' is the main location
        site = getColumnValue(row, 'LOCATION', 'SITE'); // 'LOCATION' or 'SITE' columns are the facility/site
        lga = getColumnValue(row, 'LGA');
    } else {
        // Default logic for all other sheets
        location = getColumnValue(row, 'Location', 'LOCATION', 'State');
        lga = getColumnValue(row, 'LGA');
    }

    const importedAssetData: Partial<Asset> = {
        description: description || existingAsset?.description,
        category,
        sn: getColumnValue(row, 'S/N') || existingAsset?.sn,
        location: location || existingAsset?.location,
        lga: lga || existingAsset?.lga,
        site: site || existingAsset?.site,
        assignee: assignee || existingAsset?.assignee,
        assetIdCode: assetIdCode || existingAsset?.assetIdCode,
        assetClass: getColumnValue(row, 'Asset Class', 'CLASSIFICATION') || existingAsset?.assetClass,
        manufacturer: getColumnValue(row, 'Manufacturer') || existingAsset?.manufacturer,
        modelNumber: getColumnValue(row, 'Model Number', 'MODEL NUMBERS') || existingAsset?.modelNumber,
        serialNumber: serialNumber || existingAsset?.serialNumber,
        chasisNo: chasisNo || existingAsset?.chasisNo,
        engineNo: engineNo || existingAsset?.engineNo,
        supplier: getColumnValue(row, 'Supplier', 'Suppliers') || existingAsset?.supplier,
        dateReceived: getColumnValue(row, 'Date Purchased or Received', 'Date Purchased or  Received', 'YEAR OF PURCHASE') || existingAsset?.dateReceived,
        condition: condition || existingAsset?.condition,
        grant: getColumnValue(row, 'GRANT') || existingAsset?.grant,
        costNgn: getColumnValue(row, 'Purchase price (Naira)', 'cost (ngn)') || existingAsset?.costNgn,
        costUsd: getColumnValue(row, 'Purchase Price (USD)', 'Purchase Price [USD)') || existingAsset?.costUsd,
        remarks: remarks || existingAsset?.remarks,
    };

    if (existingAsset) {
        return {
            ...existingAsset,
            ...importedAssetData,
            lastModified: new Date().toISOString(),
        };
    } else {
        return {
            id: uuidv4(),
            syncStatus: 'local',
            verifiedStatus: 'Unverified',
            ...importedAssetData,
            lastModified: new Date().toISOString(),
        } as Asset;
    }
}

export async function parseExcelFile(
    file: File, 
    enabledSheets: string[], 
    existingAssets: Asset[],
    lockAssetList: boolean
): Promise<{ assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] }> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const newAssets: Asset[] = [];
            const updatedAssets: Asset[] = [];
            let errors: string[] = [];
            let skipped = 0;
            
            const existingAssetMap = new Map<string, Asset>();
            existingAssets.forEach(asset => {
                const key = asset.assetIdCode || asset.serialNumber;
                if (key) {
                    existingAssetMap.set(key, asset);
                }
            });

            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                workbook.SheetNames.forEach(sheetName => {
                    const lowerCaseSheetName = sheetName.trim().toLowerCase();
                    const matchedSheetName = enabledSheets.find(target => lowerCaseSheetName.includes(target.toLowerCase()));

                    if (matchedSheetName) {
                        const worksheet = workbook.Sheets[sheetName];
                        if (!worksheet) {
                            errors.push(`Sheet "${sheetName}" is empty or could not be read.`);
                            return;
                        }

                        const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
                        
                        const headerRowIndex = sheetData.findIndex(row => isHeaderRow(row, matchedSheetName));

                        if (headerRowIndex === -1) {
                            console.warn(`Could not find a valid header row in sheet "${sheetName}". Skipping sheet.`);
                            return;
                        }

                        const headers = sheetData[headerRowIndex].map(cell => String(cell ?? '').trim());
                        const dataRows = sheetData.slice(headerRowIndex + 1);

                        for (const rowData of dataRows) {
                            if (!rowData || rowData.every(cell => cell === null || String(cell ?? '').trim() === '')) {
                                continue; // Skip completely empty rows
                            }
                            
                            const rowObject: { [key: string]: any } = {};
                            headers.forEach((header, index) => {
                                if (header) {
                                    rowObject[header] = rowData[index];
                                }
                            });
                            
                            const description = getColumnValue(rowObject, 'Asset Description', 'DESCRIPTION');
                            if (!description) {
                                skipped++;
                                continue;
                            }
                            
                            const idKey = getColumnValue(rowObject, 'Asset ID Code', 'TAG NUMBERS') || getColumnValue(rowObject, 'Serial Number', 'ASSET SERIAL NUMBERS');
                            const existingAsset = idKey ? existingAssetMap.get(idKey) : undefined;
                            
                            if (existingAsset) {
                                const asset = mapRowToAsset(rowObject, matchedSheetName, existingAsset);
                                updatedAssets.push(asset);
                            } else {
                                if (lockAssetList) {
                                    skipped++;
                                } else {
                                    const asset = mapRowToAsset(rowObject, matchedSheetName, undefined);
                                    newAssets.push(asset);
                                }
                            }
                        }
                    }
                });
                resolve({ assets: newAssets, updatedAssets, skipped, errors });
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during parsing.";
                resolve({ assets: [], updatedAssets: [], skipped, errors: [errorMessage] });
            }
        };
        reader.onerror = (err) => {
            resolve({ assets: [], updatedAssets: [], skipped: 0, errors: ["Failed to read the file."] });
        };
        reader.readAsArrayBuffer(file);
    });
}


// This map is the crucial link between the headers in the Excel file and the fields in our Asset object.
// It handles various spellings and names for the same piece of data.
const headerToAssetKeyMap: { [key: string]: keyof Asset } = {
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
    'purchase price (naira)': 'costNgn',
    'cost (ngn)': 'costNgn',
    'purchase price [usd)': 'costUsd',
    'purchase price (usd)': 'costUsd',
    'funder': 'funder',
    'condition': 'condition',
    'remarks': 'remarks',
    'comments': 'remarks',
    'grant': 'grant',
    'useful life (years)': 'usefulLifeYears',
    'chasis no': 'chasisNo',
    'engine no': 'engineNo',
    'qty': 'qty',
    'site': 'site',
    'imei (tablets & mobile phones)': 'imei',
};


export function exportToExcel(assets: Asset[], fileName: string): void {
  const workbook = XLSX.utils.book_new();

  const assetsByCategory = assets.reduce((acc, asset) => {
      const category = asset.category || "Uncategorized";
      if (!acc[category]) {
          acc[category] = [];
      }
      acc[category].push(asset);
      return acc;
  }, {} as Record<string, Asset[]>);

  for (const category in assetsByCategory) {
      if (Object.prototype.hasOwnProperty.call(assetsByCategory, category) && HEADER_DEFINITIONS[category]) {
          const categoryAssets = assetsByCategory[category];
          // Use the definitive headers from constants for export
          const headers = HEADER_DEFINITIONS[category];

          const finalHeaders = [...headers, 'Verified Status', 'Verified Date', 'Last Modified'];

          const dataRows = categoryAssets.map(asset => {
              const row: any[] = headers.map(header => {
                  const cleanHeader = header.toLowerCase().trim().replace(/\s+/g, ' ');
                  
                  // Special case for IHVN sheet where "LOCATION" column maps to `site` field
                  if (category === 'IHVN-GF N-THRIP' && cleanHeader === 'location') {
                      return asset['site'] ?? '';
                  }

                  const assetKey = headerToAssetKeyMap[cleanHeader];
                  if (assetKey) {
                      const value = asset[assetKey as keyof Asset];
                      return value ?? '';
                  }
                  
                  // For headers not in our map (like financial data), return empty string.
                  return '';
              });
              
              // Append verification and metadata
              row.push(asset.verifiedStatus || 'Unverified');
              row.push(asset.verifiedDate || '');
              row.push(asset.lastModified ? new Date(asset.lastModified).toLocaleString() : '');
              
              return row;
          });

          const dataWithHeaders = [finalHeaders, ...dataRows];
          const worksheet = XLSX.utils.aoa_to_sheet(dataWithHeaders);
          
          // Auto-fit columns
          const cols = finalHeaders.map((header, i) => ({
            wch: Math.max(...dataRows.map(r => String(r[i] ?? '').length), header.length) + 2
          }));
          worksheet['!cols'] = cols;

          // Sanitize sheet name for Excel limitations
          const safeSheetName = category.replace(/[\/\\?*\[\]]/g, '').substring(0, 31);
          XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
      }
  }

  XLSX.writeFile(workbook, fileName);
}
