import * as XLSX from 'xlsx';
import type { Asset } from './types';

// --- CONFIGURATION FOR CUSTOM PARSERS ---

// Map sheet names (or keywords in them) to specific parser functions
const parserConfig: { [key: string]: (data: any[]) => Asset[] } = {
  'MOTORCYCLES': parseMotorcycles,
  'NTBLCP-FAR': parseNtblcpFar,
  // Add more mappings here for other custom sheets
  // e.g., 'VEHICLES': parseVehicles,
};

// --- EXPORTED FUNCTIONS ---

/**
 * Parses an uploaded Excel file, routing to the correct parser based on sheet names.
 * @param file The Excel file to parse.
 * @returns A promise resolving to the parsed assets and a count of skipped rows.
 */
export async function parseExcelFile(file: File): Promise<{ newAssets: Asset[], skippedCount: number, error: string | null }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let allNewAssets: Asset[] = [];
        let totalSkipped = 0;

        workbook.SheetNames.forEach(sheetName => {
          const parser = findParser(sheetName);
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

          const parsedAssets = parser(jsonData);
          const validAssets = parsedAssets.filter(asset => validateRequiredFields(asset));
          
          allNewAssets = allNewAssets.concat(validAssets);
          totalSkipped += (parsedAssets.length - validAssets.length) + (jsonData.length - parsedAssets.length);
        });

        resolve({ newAssets: allNewAssets, skippedCount: totalSkipped, error: null });

      } catch (err) {
        console.error("Error parsing Excel file:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during parsing.";
        resolve({ newAssets: [], skippedCount: 0, error: errorMessage });
      }
    };

    reader.onerror = (err) => {
      console.error("FileReader error:", err);
      resolve({ newAssets: [], skippedCount: 0, error: "Failed to read the file." });
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exports an array of assets to an Excel file and triggers a download.
 * @param assets The array of assets to export.
 * @param fileName The desired name for the downloaded file.
 */
export function exportToExcel(assets: Asset[], fileName: string): void {
  // Create a worksheet from the assets data
  const worksheet = XLSX.utils.json_to_sheet(assets);
  
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Append the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
  
  // Write the workbook and trigger the download
  XLSX.writeFile(workbook, fileName);
}


// --- PARSER IMPLEMENTATIONS ---

/**
 * Finds the appropriate parser function for a given sheet name.
 * Falls back to a generic parser if no specific one is found.
 */
function findParser(sheetName: string): (data: any[]) => Asset[] {
  const upperSheetName = sheetName.toUpperCase();
  for (const key in parserConfig) {
    if (upperSheetName.includes(key)) {
      return parserConfig[key];
    }
  }
  return parseGeneric;
}

/**
 * A generic parser that maps common field names to the Asset type.
 */
function parseGeneric(data: any[]): Asset[] {
  return data.map((row, index) => {
    const asset: Partial<Asset> = {
      id: `imported-${Date.now()}-${index}`,
      assetName: String(row.assetName || row['Asset Name'] || row['Description'] || ''),
      serialNumber: String(row.serialNumber || row['Serial Number'] || row['Serial No.'] || ''),
      category: String(row.category || row['Category'] || ''),
      location: String(row.location || row['Location'] || ''),
      status: (row.status || row['Status'] || 'In Storage') as Asset['status'],
      condition: (row.condition || row['Condition'] || 'Good') as Asset['condition'],
      assignedTo: String(row.assignedTo || row['Assigned To'] || ''),
      purchaseDate: String(row.purchaseDate || row['Purchase Date'] || ''),
      notes: String(row.notes || row['Notes'] || ''),
      photoUrl: String(row.photoUrl || 'https://placehold.co/400x400.png'),
    };
    return asset as Asset;
  });
}

/**
 * Custom parser for sheets named "MOTORCYCLES".
 */
function parseMotorcycles(data: any[]): Asset[] {
  return data.map((row, index) => {
    const asset: Partial<Asset> = {
      id: `imported-motorcycle-${Date.now()}-${index}`,
      assetName: String(row['Motorcycle Model'] || row['Model'] || ''),
      serialNumber: String(row['Chassis Number'] || row['VIN'] || ''),
      category: 'Vehicle', // Hardcoded category
      location: String(row['State'] || row['Location'] || ''),
      status: 'In Use', // Default status
      condition: 'Good', // Default condition
      assignedTo: String(row['Rider'] || row['Assigned To'] || ''),
      purchaseDate: '',
      notes: `Plate Number: ${row['Plate Number'] || 'N/A'}`,
      photoUrl: 'https://placehold.co/400x400.png',
    };
    return asset as Asset;
  });
}

/**
 * Custom parser for sheets named "NTBLCP-FAR".
 */
function parseNtblcpFar(data: any[]): Asset[] {
  return data.map((row, index) => {
    const asset: Partial<Asset> = {
      id: `imported-far-${Date.now()}-${index}`,
      assetName: String(row['Asset Description'] || ''),
      serialNumber: String(row['Serial No.'] || ''),
      category: String(row['Asset Category'] || 'Uncategorized'),
      location: String(row['Location'] || ''),
      status: 'In Use',
      condition: 'Good',
      purchaseDate: String(row['Date of Purchase'] || ''),
      notes: `Asset Tag No: ${row['Asset Tag No.'] || 'N/A'}`,
      photoUrl: 'https://placehold.co/400x400.png',
    };
    return asset as Asset;
  });
}


// --- UTILITY FUNCTIONS ---

/**
 * Validates that an asset object contains all required fields.
 */
function validateRequiredFields(asset: Asset): boolean {
  const requiredFields: (keyof Asset)[] = ['assetName', 'serialNumber', 'category', 'location', 'status', 'condition'];
  for (const field of requiredFields) {
    if (!asset[field]) {
      // console.warn(`Skipping asset due to missing required field: ${field}`, asset);
      return false;
    }
  }
  return true;
}
