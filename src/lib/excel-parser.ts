
import * as XLSX from 'xlsx';
import type { Asset } from './types';
import { TARGET_SHEETS } from './constants';
import { v4 as uuidv4 } from 'uuid';

// --- HEADER DEFINITIONS ---
const HEADERS_NTBLCP_TB_FAR = ["S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Supplier", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Remarks", "GRANT", "Useful Life (Years)", "2019 (NGN)", "2020 (NGN)", "2021 (NGN)", "2022 (NGN)", "Accumulated Depreciation (NGN)", "Net Book Value (NGN)", "X", "2019 (USD)", "2020 (USD)", "2021 (USD)", "2022 (USD)", "Accumulated Depreciation (USD)", "Net Book Value (USD)", "x", "ADDED ASSETS (2022–2023)", "IMEI (TABLETS & MOBILE PHONES)", "a", "Assignee", "Asset ID Code", "Asset Class", "Manufacturer", "Model Number", "Serial Number", "Suppliers", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Comments"];
const HEADERS_MOTORCYCLES_C19RM = ["S/N", "Location", "LGA", "Assignee", "Asset Description", "Asset ID Code", "Asset Class", "Manufacturer", "Chasis no", "Engine no", "Suppliers", "Date Purchased or Received", "Chq No / Goods Received Note No.", "PV No", "Purchase price (Naira)", "Purchase Price [USD)", "Funder", "Condition", "Remarks", "GRANT", "Useful Life (Years)", "2019 (NGN)", "2020 (NGN)", "2021 (NGN)", "2022 (NGN)", "Accumulated Depreciation (NGN)", "Net Book Value (NGN)", "X", "2019 (USD)", "2020 (USD)", "2021 (USD)", "2022 (USD)", "Accumulated Depreciation (USD)", "Net Book Value (USD)", "x"];

// --- SHEET CONFIGURATION ---
const SHEET_CONFIGS: { [key: string]: { headers: string[] | null, parser: (data: any[], category: string) => Asset[] } } = {
  'NTBLCP-TB-FAR': { headers: HEADERS_NTBLCP_TB_FAR, parser: parseNtblcpFar },
  'MOTORCYCLES-C19RM': { headers: HEADERS_MOTORCYCLES_C19RM, parser: parseMotorcyclesC19rm },
  'PDX-C19RM': { headers: null, parser: parseGeneric }, // Placeholder
  'TB LAMP-C19RM': { headers: null, parser: parseGeneric }, // Placeholder
  'ECG monitors': { headers: null, parser: parseGeneric }, // Placeholder
  'IHVN-GF N-THRIP': { headers: null, parser: parseGeneric }, // Placeholder
  'TRUENAT-C19RM': { headers: null, parser: parseGeneric }, // Placeholder
  'Vehicles-TB (IHVN)': { headers: null, parser: parseGeneric }, // Placeholder
  'GeneXpert machines-TB': { headers: null, parser: parseGeneric }, // Placeholder
};

// --- MAIN EXPORTED FUNCTION ---
export async function parseExcelFile(file: File): Promise<{ assetsBySheet: { [sheetName: string]: Asset[] }, errors: string[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      let assetsBySheet: { [sheetName: string]: Asset[] } = {};
      let errors: string[] = [];

      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        workbook.SheetNames.forEach(sheetName => {
          const matchedSheetName = TARGET_SHEETS.find(target => sheetName.trim().toLowerCase() === target.toLowerCase());

          if (matchedSheetName) {
            const config = SHEET_CONFIGS[matchedSheetName];
            const worksheet = workbook.Sheets[sheetName];
            const headerRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
            
            if (config.headers && !validateHeaders(headerRow, config.headers)) {
              errors.push(`Sheet "${sheetName}" has invalid headers. Expected: [${config.headers.join(", ")}]. Got: [${headerRow.join(", ")}].`);
              return;
            }
            
            const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
            const parsedAssets = config.parser(jsonData, matchedSheetName);
            assetsBySheet[matchedSheetName] = parsedAssets;
          }
        });
        resolve({ assetsBySheet, errors });

      } catch (err) {
        console.error("Error parsing Excel file:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during parsing.";
        resolve({ assetsBySheet: {}, errors: [errorMessage] });
      }
    };
    reader.onerror = (err) => {
      console.error("FileReader error:", err);
      resolve({ assetsBySheet: {}, errors: ["Failed to read the file."] });
    };
    reader.readAsArrayBuffer(file);
  });
}

// --- UTILITY FUNCTIONS ---
function validateHeaders(actualHeaders: string[], expectedHeaders: string[]): boolean {
  if (actualHeaders.length < expectedHeaders.length) return false;
  return expectedHeaders.every((header, index) => actualHeaders[index]?.trim() === header.trim());
}

function createBaseAsset(row: any, category: string): Asset {
  return {
    id: uuidv4(),
    category: category,
    sn: String(row['S/N'] || ''),
    location: String(row['Location'] || ''),
    lga: String(row['LGA'] || ''),
    assignee: String(row['Assignee'] || ''),
    description: String(row['Asset Description'] || ''),
    assetIdCode: String(row['Asset ID Code'] || ''),
    assetClass: String(row['Asset Class'] || ''),
    manufacturer: String(row['Manufacturer'] || ''),
    modelNumber: String(row['Model Number'] || ''),
    serialNumber: String(row['Serial Number'] || ''),
    supplier: String(row['Supplier'] || row['Suppliers'] || ''),
    dateReceived: String(row['Date Purchased or Received'] || ''),
    grnNo: String(row['Chq No / Goods Received Note No.'] || ''),
    pvNo: String(row['PV No'] || ''),
    priceNaira: String(row['Purchase price (Naira)'] || ''),
    priceUSD: String(row['Purchase Price [USD)'] || ''),
    funder: String(row['Funder'] || ''),
    condition: String(row['Condition'] || ''),
    remarks: String(row['Remarks'] || ''),
    grant: String(row['GRANT'] || ''),
    usefulLifeYears: String(row['Useful Life (Years)'] || ''),
    accumulatedDepreciation: {
        ngn: String(row['Accumulated Depreciation (NGN)'] || ''),
        usd: String(row['Accumulated Depreciation (USD)'] || ''),
    },
    netBookValue: {
        ngn: String(row['Net Book Value (NGN)'] || ''),
        usd: String(row['Net Book Value (USD)'] || ''),
    },
    imei: String(row['IMEI (TABLETS & MOBILE PHONES)'] || ''),
    comments: String(row['Comments'] || ''),
    originalData: row,
  };
}


// --- CUSTOM PARSERS ---
function parseNtblcpFar(data: any[], category: string): Asset[] {
  return data.map(row => {
    const asset = createBaseAsset(row, category);
    asset.valuesByYear = {
      '2019': { ngn: String(row['2019 (NGN)'] || ''), usd: String(row['2019 (USD)'] || '') },
      '2020': { ngn: String(row['2020 (NGN)'] || ''), usd: String(row['2020 (USD)'] || '') },
      '2121': { ngn: String(row['2021 (NGN)'] || ''), usd: String(row['2021 (USD)'] || '') },
      '2022': { ngn: String(row['2022 (NGN)'] || ''), usd: String(row['2022 (USD)'] || '') },
    };
    return asset;
  });
}

function parseMotorcyclesC19rm(data: any[], category: string): Asset[] {
  return data.map(row => {
    const asset = createBaseAsset(row, category);
    asset.chasisNo = String(row['Chasis no'] || '');
    asset.engineNo = String(row['Engine no'] || '');
    asset.valuesByYear = {
      '2019': { ngn: String(row['2019 (NGN)'] || ''), usd: String(row['2019 (USD)'] || '') },
      '2020': { ngn: String(row['2020 (NGN)'] || ''), usd: String(row['2020 (USD)'] || '') },
      '2121': { ngn: String(row['2021 (NGN)'] || ''), usd: String(row['2021 (USD)'] || '') },
      '2022': { ngn: String(row['2022 (NGN)'] || ''), usd: String(row['2022 (USD)'] || '') },
    };
    return asset;
  });
}

// Generic parser for sheets without specific header configs yet
function parseGeneric(data: any[], category: string): Asset[] {
  return data.map(row => createBaseAsset(row, category));
}

// --- EXPORT FUNCTIONALITY ---
export function exportToExcel(assets: Asset[], fileName: string): void {
  const dataToExport = assets.map(asset => ({
    ...asset.originalData,
    Category: asset.category,
    ID: asset.id,
  }));
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
  XLSX.writeFile(workbook, fileName);
}
