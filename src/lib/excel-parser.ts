
import * as XLSX from 'xlsx';
import type { Asset } from './types';
import { TARGET_SHEETS, HEADER_DEFINITIONS } from './constants';
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
        const lowerKey = key.toLowerCase().replace(/\s+/g, ' ');
        for(const rowKey in row) {
            if(rowKey.toLowerCase().trim().replace(/\s+/g, ' ') === lowerKey) {
                const value = row[rowKey];
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

function mapRowToAsset(row: any, category: string, existingAsset?: Asset): Asset {
    const description = getColumnValue(row, 'Asset Description', 'DESCRIPTION');
    const assetIdCode = getColumnValue(row, 'Asset ID Code', 'TAG NUMBERS');
    const serialNumber = getColumnValue(row, 'Serial Number', 'ASSET SERIAL NUMBERS');
    const chasisNo = getColumnValue(row, 'Chasis no');
    const engineNo = getColumnValue(row, 'Engine no');
    const location = category === 'IHVN-GF N-THRIP'
        ? getColumnValue(row, 'STATE', 'Location', 'LOCATION')
        : getColumnValue(row, 'Location', 'LOCATION', 'State');
    const lga = getColumnValue(row, 'LGA');
    
    let assignee = getColumnValue(row, 'Assignee');
    if (assignee.toLowerCase() === 'yes' || assignee.toLowerCase() === 'no') {
        assignee = '';
    }

    const condition = getColumnValue(row, 'Condition');
    const remarks = getColumnValue(row, 'Remarks', 'Comments');

    const importedAssetData: Partial<Asset> = {
        description: description || existingAsset?.description,
        category,
        sn: getColumnValue(row, 'S/N') || existingAsset?.sn,
        location: location || existingAsset?.location,
        lga: lga || existingAsset?.lga,
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
        costNgn: getColumnValue(row, 'COST (NGN)') || existingAsset?.costNgn,
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
    existingAssets: Asset[]
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
                            // Don't error out, but log it. Some sheets might just not be relevant.
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
                            
                            // A row is considered valid if it has any data at all.
                            const hasAnyData = Object.values(rowObject).some(val => val !== null && val !== '');

                            if (!hasAnyData) {
                                skipped++;
                                continue;
                            }
                            
                            const idKey = getColumnValue(rowObject, 'Asset ID Code', 'TAG NUMBERS') || getColumnValue(rowObject, 'Serial Number', 'ASSET SERIAL NUMBERS');
                            const existingAsset = idKey ? existingAssetMap.get(idKey) : undefined;
                            
                            const asset = mapRowToAsset(rowObject, matchedSheetName, existingAsset);
                            
                            if (asset.description || idKey) { // Import if it has a description or a key
                                if (existingAsset) {
                                    updatedAssets.push(asset);
                                } else {
                                    newAssets.push(asset);
                                }
                            } else {
                                skipped++;
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

          const finalHeaders = [...headers, 'Verified Status', 'Verified Date', 'Last Modified'];

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
              row.push(asset.lastModified ? new Date(asset.lastModified).toLocaleString() : '');
              return row;
          });

          const dataWithHeaders = [finalHeaders, ...dataRows];
          const worksheet = XLSX.utils.aoa_to_sheet(dataWithHeaders);
          
          const cols = finalHeaders.map((header, i) => ({
            wch: Math.max(...dataRows.map(r => r[i]?.toString().length ?? 0), header.length) + 2
          }));
          worksheet['!cols'] = cols;

          XLSX.utils.book_append_sheet(workbook, worksheet, category.substring(0, 31));
      }
  }

  XLSX.writeFile(workbook, fileName);
}
