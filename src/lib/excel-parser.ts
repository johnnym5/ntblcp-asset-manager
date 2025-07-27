
import * as XLSX from 'xlsx';
import type { Asset, AppSettings, SheetDefinition, DisplayField } from './types';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_ALIASES, IHVN_SUB_SHEET_DEFINITIONS } from './constants';
import { Timestamp } from 'firebase/firestore';

const normalizeHeader = (header: any): string => {
    if (header === null || header === undefined) return '';
    return String(header).trim().toUpperCase().replace(/\s+/g, ' ');
};

const findHeaderRowIndex = (sheetData: any[][], definitiveHeaders: string[], startRow: number = 0): number => {
    const normalizedDefinitiveHeaders = definitiveHeaders.map(normalizeHeader);
    
    for (let i = startRow; i < Math.min(sheetData.length, startRow + 25); i++) { // Search deeper
        const row = sheetData[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedDefinitiveHeaders.filter(h => normalizedRow.includes(h)).length;
        
        // Use a more robust matching threshold
        if (matchCount / normalizedDefinitiveHeaders.length >= 0.7) {
            return i;
        }
    }
    return -1;
};

const COLUMN_TO_ASSET_FIELD_MAP = new Map<string, keyof Asset>();
for (const key in HEADER_ALIASES) {
    const assetKey = key as keyof Asset;
    const aliases = HEADER_ALIASES[assetKey];
    if (aliases) {
        for (const alias of aliases) {
            COLUMN_TO_ASSET_FIELD_MAP.set(normalizeHeader(alias), assetKey);
        }
    }
}

export const sanitizeForFirestore = <T extends object>(obj: T): T => {
    const sanitizedObj: { [key: string]: any } = {};
    for (const key in obj) {
        const value = (obj as any)[key];
        if (key === 'previousState') {
            continue; 
        }
        if (value !== undefined) {
            if (value instanceof Date) {
                sanitizedObj[key] = Timestamp.fromDate(value);
            } else {
                sanitizedObj[key] = value;
            }
        }
    }
    return sanitizedObj as T;
};

const parseRows = (headerRow: any[], jsonData: any[][], category: string): { assets: Asset[], rowsParsed: number } => {
    const assets: Asset[] = [];
    let rowsParsed = 0;

    for (const row of jsonData) {
        rowsParsed++;
        // Stop if we hit an empty row or what looks like a new header section
        if (row.every(cell => cell === null || String(cell).trim() === '') || (row[0] && normalizeHeader(row[0]) === 'S/N' && assets.length > 0)) {
            // If we hit a new "S/N" header after already parsing some assets, it's a new section.
             rowsParsed--; // Don't count this row as parsed for the current section
            break;
        }

        const assetObject: Partial<Asset> = { category };
        let hasData = false;
        
        headerRow.forEach((rawHeader, colIndex) => {
            if (rawHeader === null || rawHeader === undefined) return;

            const normalizedHeader = normalizeHeader(rawHeader);
            let fieldName = COLUMN_TO_ASSET_FIELD_MAP.get(normalizedHeader);
            
            // Special mapping for IHVN sheets
            if(category.startsWith('IHVN')) {
                if(normalizedHeader === 'LOCATION') fieldName = 'lga';
                if(normalizedHeader === 'STATE') fieldName = 'location';
                if(normalizedHeader === 'LOCATION/USER') fieldName = 'assignee';
            }
            
            if (fieldName) {
                const cell = row[colIndex];
                const finalValue = (cell && cell.w) ? String(cell.w).trim() : (cell !== null && cell !== undefined ? String(cell).trim() : null);

                if (finalValue) {
                   (assetObject as any)[fieldName] = finalValue;
                   hasData = true;
                }
            }
        });
        
        if (hasData && (assetObject.description || assetObject.assetIdCode || assetObject.serialNumber)) {
           const newAsset: Asset = { 
                id: uuidv4(), 
                ...assetObject, 
                verifiedStatus: 'Unverified',
            } as Asset;
            assets.push(newAsset);
        }
    }
    return { assets, rowsParsed };
}


export async function parseExcelFile(
    fileOrBuffer: File | ArrayBuffer, 
    appSettings: AppSettings, 
    existingAssets: Asset[],
    singleSheetName?: string
): Promise<{ assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] }> {
    const { sheetDefinitions } = appSettings;
    let newAssets: Asset[] = [];
    const errors: string[] = [];

    try {
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellText: false });
        
        // Check if this import is for the special combined IHVN sheet
        const isIHVNImport = singleSheetName === 'IHVN-GF N-THRIP' || (!singleSheetName && appSettings.enabledSheets.includes('IHVN-GF N-THRIP'));

        if (isIHVNImport) {
            const ihvnMasterSheetName = workbook.SheetNames.find(s => normalizeHeader(s).includes(normalizeHeader('IHVN-GF N-THRIP')));
            if (ihvnMasterSheetName) {
                const sheet = workbook.Sheets[ihvnMasterSheetName];
                const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
                let currentPos = 0;
                
                 for (const subSheetName in IHVN_SUB_SHEET_DEFINITIONS) {
                    const headers = IHVN_SUB_SHEET_DEFINITIONS[subSheetName];
                    const headerRowIndex = findHeaderRowIndex(sheetData, headers, currentPos);

                    if (headerRowIndex !== -1) {
                        const headerRow = sheetData[headerRowIndex];
                        const groupData = sheetData.slice(headerRowIndex + 1);
                        const { assets: parsedGroupAssets, rowsParsed } = parseRows(headerRow, groupData, 'IHVN-GF N-THRIP');
                        newAssets.push(...parsedGroupAssets);
                        currentPos = headerRowIndex + rowsParsed + 1; // Move pointer past the parsed section
                    }
                }
            } else if (singleSheetName === 'IHVN-GF N-THRIP') {
                 errors.push(`Could not find a sheet named "IHVN-GF N-THRIP" in the file.`);
            }
        }

        // Process other sheets, excluding the IHVN one if it was already handled
        const sheetNamesToProcess = singleSheetName
            ? (singleSheetName === 'IHVN-GF N-THRIP' ? [] : [singleSheetName])
            : Object.keys(sheetDefinitions).filter(sheetName => appSettings.enabledSheets.includes(sheetName) && sheetName !== 'IHVN-GF N-THRIP');

        for (const targetSheetName of sheetNamesToProcess) {
            const definition = sheetDefinitions[targetSheetName];
            if (!definition) {
                 if(singleSheetName) errors.push(`No definition found for sheet: "${targetSheetName}".`);
                 continue;
            }

            const actualSheetName = workbook.SheetNames.find(s => normalizeHeader(s).includes(normalizeHeader(targetSheetName)));

            if (!actualSheetName) {
                if (singleSheetName) errors.push(`Could not find a sheet with the name: "${targetSheetName}".`);
                continue;
            }

            const sheet = workbook.Sheets[actualSheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            
            const headerRowIndex = findHeaderRowIndex(sheetData, definition.headers);

            if (headerRowIndex === -1) {
                errors.push(`Could not find a valid header row in sheet: "${actualSheetName}".`);
                continue;
            }
            
            const headerRow = sheetData[headerRowIndex];
            const jsonData = sheetData.slice(headerRowIndex + 1);
            const { assets: parsedSheetAssets } = parseRows(headerRow, jsonData, targetSheetName);
            newAssets.push(...parsedSheetAssets);
        }

        if (newAssets.length > 0) {
           newAssets = applyNtblcpFarPatch(newAssets);
        }

        if (newAssets.length === 0 && errors.length === 0) {
            errors.push(`No data found to import. Check if sheet names in the file match the enabled sheets in Settings.`);
        }
    } catch (e) {
        console.error("Error parsing Excel file:", e);
        if (e instanceof Error && e.message.includes('permission')) {
             errors.push('The requested file could not be read, typically due to permission problems.');
        } else {
             errors.push(e instanceof Error ? e.message : "An unknown error occurred during parsing.");
        }
    }
    
    return { assets: newAssets, updatedAssets: [], skipped: 0, errors };
}



export function exportToExcel(assets: Asset[], sheetDefinitions: Record<string, SheetDefinition>, fileName: string): void {
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
        if (!definition) continue;

        const headerArray = definition?.headers?.length > 0 ? [...definition.headers] : [];
        if (headerArray.length === 0) continue; 
        
        if (!headerArray.includes("Verified Status")) headerArray.push("Verified Status");
        if (!headerArray.includes("Verified Date")) headerArray.push("Verified Date");
        if (!headerArray.includes("Last Modified By")) headerArray.push("Last Modified By");
        if (!headerArray.includes("Last Modified Date")) headerArray.push("Last Modified Date");
        
        const sheetData = assetsByCategory[category].map(asset => {
            const row: { [key: string]: any } = {};
            headerArray.forEach(header => {
                const normalizedHeader = normalizeHeader(header);
                
                let assetKey: keyof Asset | undefined;
                for (const key in HEADER_ALIASES) {
                    if (HEADER_ALIASES[key as keyof typeof HEADER_ALIASES].map(a => normalizeHeader(a)).includes(normalizedHeader)) {
                        assetKey = key as keyof Asset;
                        break;
                    }
                }
                
                if (assetKey) {
                   row[header] = asset[assetKey] ?? '';
                } else {
                   if (normalizedHeader === 'VERIFIED STATUS') row[header] = asset.verifiedStatus || 'Unverified';
                   else if (normalizedHeader === 'VERIFIED DATE') row[header] = asset.verifiedDate || '';
                   else if (normalizedHeader === 'LAST MODIFIED BY') row[header] = asset.lastModifiedBy || '';
                   else if (normalizedHeader === 'LAST MODIFIED DATE') row[header] = asset.lastModified ? new Date(asset.lastModified).toLocaleString() : '';
                   else row[header] = '';
                }
            });
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


export async function parseExcelForTemplate(file: File): Promise<SheetDefinition[]> {
  const templates: SheetDefinition[] = [];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const allPossibleHeaders = new Set<string>();
  Object.values(IHVN_SUB_SHEET_DEFINITIONS).forEach(def => {
    def.forEach(h => allPossibleHeaders.add(normalizeHeader(h)));
  });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
        const row = sheetData[i];
        if (!Array.isArray(row)) continue;
        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedRow.filter(h => allPossibleHeaders.has(h)).length;

        if (matchCount > 5) {
            const headerRow = row.map(h => String(h || '').trim()).filter(h => h);
            
            const displayFields: DisplayField[] = headerRow.map(header => {
              const normalized = normalizeHeader(header);
              for (const key in HEADER_ALIASES) {
                if (HEADER_ALIASES[key as keyof typeof HEADER_ALIASES].map(a => normalizeHeader(a)).includes(normalized)) {
                  return {
                    key: key as keyof Asset,
                    label: header,
                    table: ['S/N', 'DESCRIPTION', 'ASSET ID CODE', 'ASSIGNEE', 'VERIFIED STATUS'].includes(normalized),
                    quickView: true,
                  };
                }
              }
              return null;
            }).filter(Boolean) as DisplayField[];

            templates.push({
                name: sheetName,
                headers: headerRow,
                displayFields: displayFields,
            });
            break; 
        }
    }
  }

  if (templates.length === 0) {
    throw new Error("Could not find any valid header rows in the provided Excel file.");
  }

  return templates;
}

export function applyNtblcpFarPatch(assets: Asset[]): { updatedAssets: Asset[], updatedCount: number } {
    let updatedCount = 0;
    const assigneeMap = ["PMU Finance Office", "Finance", "Admin", "PMU Finance Office", "Admin", "Admin", "PMU Finance Office", "Admin/PMU finance office", "Finance", "Admin Office", "Finance", "Steve IT", "Conference Room", "Conference Room", "Store", "Head Admin/Finance", "NC’s Office", "Finance", "Head Admin/Finance", "ACSM", "Finance", "Head PPM/DOT/Leprosy,BU", "PMDT", "PMDT Open office space", "ACSM Open office space", "Head of Finance/Admin", "NC's Office", "Finance", "NC's Office", "Mr Adeleke", "Mr. Daodu Olumide", "NC's Office", "Finance", "Finance", "Conference room", "Conference Room", "Conference Room", "Conference Room", "Conference Room", "NC office", "Finance", "Head of Finance", "Mr. Stephen Raji", "Admin", "PMU Finance Office", "Finance", "Finance", "IT room", "IT room", "IT room", "Niger STBLCP", "Niger State Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "Infusion Center", "Benue store", "Kogi STBLCP", "Kogi STBLCP", "PSM GROUND FLOOR", "PMU SFO office", "FCT", "North East Zonal Store", "North East Zonal Store", "Bauchi Store", "YOBE STBLCO", "State store", "BORNO STBLCO", "North East Zonal Store", "North East Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "Kaduna State Store", "AkwaIbom STBLCO", "AkwaIbom STBLCO", "Bayelsa STBLCO", "CrossRiver STBLCO", "Delta STBLCO", "State store", "State store", "State store", "Abia STBLCO", "Enugu Store", "Imo STBLCO", "South East Zonal Store", "Ondo STBLCO", "South West Zonal Store", "South West Zonal Store", "UCH", "SACRED HEART HOSPITAL", "EKITI STBLCO", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "FCMS", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "Kogi STBLCP", "Kogi STBLCP", "Kogi STBLCP", "Kogi STBLCP", "Kogi STBLCP", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "North Central Zonal Store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "State store", "North East Zonal Store", "North East Zonal Store", "North East Zonal Store", "North East Zonal Store", "North East Zonal Store", "North East Zonal Store", "North East Zonal Store", "North East Zonal Store", "North East Zonal Store", "North East Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "North West Zonal Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "South South Zonal Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "South West Zonal Store", "Steve Raji", "Steve Raji", "Steve Raji", "Steve Raji", "Chidera Ogoh", "Dr Emperor", "Steve Raji", "Raji Mobolaji", "GFA", "Finance", "Babatunde Adeleke", "Dr Emperor", "Audit office", "Olawumi Olarewaju", "Finance", "Dr Chukwuma Anyaike", "Mr Linus Dapiyah", "PSM", "PSM", "FINANCE", "FINANCE", "FINANCE", "FINANCE", "M&E", "M&E", "M&E", "FINANCE", "PMU programs", "PSM", "MUMMY TUBI", "HR", "HR", "FINANCE", "AUDIT", "AUDIT", "DR EMPEROR", "FA", "FA", "F&A Mgr", "PSM", "Finance Unit", "GFA", "HR", "Situation Room", "Conference room", "NC's Office (sect)", "NC's Office", "Dr Emperor", "Dr Emperor", "PMU KITCHEN", "FINANCE", "Dr Emperor", "PMU KITCHEN", "PMU KITCHEN", "Finance office", "Finance office", "FINANCE", "FINANCE", "PSM", "M&E", "FA", "FINANCE", "FUNMI", "DR EMPEROR", "WEASLEY", "DR EMPEROR", "Conference room", "MARY", "Broken", "LINDA FA", "DR EMPEROR", "TOSIN", "Team Lead", "DR OMBEKA", "ANN", "Broken", "TUMISHE FA", "DR EMPEROR", "Mrs Elizabeth", "Samuel Rabo", "Dr Emperor", "DR OBIOMA", "GFA Ofice", "GFA Ofice", "ADELEKE", "Programs Office", "GFA Ofice", "PHARM RAJI", "OFURE", "MUMMY TUBI", "Audit Office", "DR OMBEKA", "SFO ffice", "Dr Emperor", "Programs Office", "Pharm Raji", "MUMMY TUBI", "Mr Adeleke", "Dr Obioma", "GFA Ofice", "Finance office", "Mr Israel Adio", "Audit Office", "SFO ffice", "Benue M&E", "Rivers M&E", "Cross River M&E", "Enugu M&E", "Lagos M&E", "Abia M&E", "Kano M&E", "Adamawa M&E", "Imo M&E", "Ogun M&E", "Delta M&E Officer", "Kwara M & E", "Ebonyi M&E", "Anambra M&E", "Kogi M&E", "Yobe M&E", "Oyo M& E Officer", "Bayelsa M&E", "Sokoto M&E", "Ekiti M&E", "Kebbi M&E", "Bauchi M&E", "Osun M&E", "Jigawa M&E", "Kaduna M&E", "Nasarawa M&E", "Zamfara M&E", "Katsina M&E", "Akwa Ibom M&E", "Borno M&E", "Ondo", "Plateau M&E", "Gombe M&E", " Edo M&E", "Taraba M&E", "Niger M&E", "Wumi", "Admin Office", "Audit Office", "IT Officer", "IT Office", "IT Office", "IT Office", "Ofure Ugbesia", "Dr Emperor Ubochioma", "Team Lead", "Situation Room", "PMU Programs", "Finance PMU", "HR/Admin Office", "Chidera Ogoh", "PSM", "Linus Dapiyah", "PSM office", "NTBLCP", "Finance PMU", "Finance PMU", "Finance PMU", "GFA Ofice", "Team Lead", "Conference room", "ACSM", "ACSM", "PMU Finance Office", "GFA Ofice", "Lab Unit", "PSM Unit", "PMU Programs", "PMU Admin/HR", "IT Equipment Room", "M&E PMU", "Programs", "Audit Office", "Admin Office", "Logistics", "PPM", "M&E", "Pharm Alhassan", "NTBLCP IT & Communication OFficer", "NTBLCP IT & Communication OFficer", "Rebecca Owolabi", "IT Store", "IT Store", "Admin", "Admin", "Finance Unit", "Finance Unit", "Finance Unit", "IT officer", "Lab Manager - Mrs. Abiola Tubi", "Weasley", "IT officer", "IT/Communications Officer - Mr. Stephen Raji", "IT Store", "Daodu Olumide", "Israel Adio", "Samuel Rabo", "Pharm. Raji Mobolaji", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Program Manager", "Linus Dapiyah", "Dr Obioma Akaniro", "Mrs Funmilayo Omosebi", "Miss Wumi Olarewaju", "Dr Folasade Idowu ( SW Zone)", "Dr Geoge Ikpe (SE Zone)", "Pharm AlhassanShuaibu", "IT Store", "Wesley Bala", "IT Store", "Gambo Ajegena", "Ofure Ugbesia", "MTN Data Centre", "MTN Data Centre", "Mary Etolue", "Bauchi State M& E Officer", "Abia State M& E Officer", "Akwa Ibom State M& E Officer", "Kwara M& E Officer", "Borno State M& E Officer", "Plateau State M& E Officer", "Delta State M& E Officer", "Yobe State M& E Officer", "FCT State M& E Officer", "Gombe State M& E Officer", "Oyo State M& E Officer", "Ondo State M& E Officer", "Katsina State M& E Officer", "Rivers State M& E Officer", "PM", "PM", "PM", "PM", "PM", "PM", "PM", "PM", "PM", "PM", "PM", "PM", "PM", "PM", "NTBLCP", "PM", "Program Manager", "PM", "PM", "PM", "PM", "PM", "PM", "PM", "NTBLCP", "PM", "PM", "PM", "NTBLCP", "NTBLCP"];
    const assetIdCodeMap = ["ARFH/NP/GF/TB/OE/003A-K", "ARFH/NP/GF/TB/OE/005", "ARFH/NP/GF/TB/OE/006", "ARFH/NP/GF/TB/OE/007A-B", "ARFH/NP/GF/TB/OE/008", "ARFH/NP/GF/TB/OE/009", "ARFH/NP/GF/TB/OE/010A-B", "ARFH/NP/GF/TB/OE/011", "ARFH/NP/GF/TB/CP/013", "ARFH/NP/GF/TB/OE/012", "ARFH/NP/GF/TB/OE/013", "ARFH/NP/GF/TB/OE/014", "ARFH/NP/GF/TB/OE/016", "ARFH/NP/GF/TB/OE/017", "ARFH/NP/GF/TB/OE/018", "ARFH/NP/GF/TB/OE/021", "ARFH/NP/GF/TB/OE/022", "ARFH/NP/GF/TB/OE/023", "ARFH/NP/GF/TB/OE/024", "ARFH/NP/GF/TB/OE/025", "ARFH/NP/GF/TB/OE/028", "ARFH/NP/GF/TB/OE/029", "ARFH/NP/GF/TB/OE/030", "ARFH/NP/GF/TB/OE/031", "ARFH/NP/GF/TB/OE/032", "ARFH/NP/GF/TB/OE/033", "ARFH/NP/GF/TB/OF/001", "ARFH/NP/GF/TB/OE/034", "ARFH/NP/GF/TB/OF/002", "IHVN/EQP/0324", "IHVN/1T/2", "- 000659/3", "ARFH/NP/GF/TB/OE/035", "IHVN/OFFICE/1", "- 004019", "ARFH/NP/GF/TB/OE/039", "ARFH/NP/GF/TB/OF/003", "ARFH/NP/GF/TB/OF/004", "ARFH/NP/GF/TB/OF/005", "ARFH/NP/GF/TB/OF/006", "ARFH/NP/GF/TB/OF/007", "ARFH/NP/GF/TB/OF/008", "ARFH/NP/GF/TB/CP/017", "ARFH/NP/GF/TB/CP/018", "ARFH/NP/GF/TB/CP/019", "ARFH/NP/GF/TB/OE/040", "ARFH/NP/GF/TB/OE/041", "ARFH/NP/GF/TB/OE/043", "ARFH/NP/GF/TB/OE/044", "ARFH/NP/GF/TB/OE/045", "ARFH/NP/GF/TB/OE/046", "ARFH/NP/GF/TB/OE/047", "ARFH/NP/GF/TB/OE/048", "GF - NTBLCP/OE/048", "GF - NTBLCP/OE/049", "GF - NTBLCP/OE/050", "GF - NTBLCP/OE/051", "GF - NTBLCP/OE/052", "GF - NTBLCP/OE/053", "GF - NTBLCP/OE/054", "GF - NTBLCP/OE/055", "GF - NTBLCP/OE/056", "GF - NTBLCP/OE/057", "GF - NTBLCP/OE/495", "GF - NTBLCP/OE/034", "GF - NTBLCP/OE/060", "GF - NTBLCP/OE/061", "GF - NTBLCP/OE/062", "GF - NTBLCP/OE/063", "GF - NTBLCP/OE/064", "GF - NTBLCP/OE/065", "GF - NTBLCP/OE/066", "GF - NTBLCP/OE/067", "GF - NTBLCP/OE/068", "GF - NTBLCP/OE/069", "GF - NTBLCP/OE/070", "GF - NTBLCP/OE/071", "GF - NTBLCP/OE/072", "GF - NTBLCP/OE/073", "GF - NTBLCP/OE/074", "GF - NTBLCP/OE/075", "GF - NTBLCP/OE/076", "GF - NTBLCP/OE/077", "GF - NTBLCP/OE/078", "GF - NTBLCP/OE/079", "GF - NTBLCP/OE/080", "GF - NTBLCP/OE/081", "GF - NTBLCP/OE/082", "GF - NTBLCP/OE/083", "GF - NTBLCP/OE/084", "GF - NTBLCP/OE/085", "GF - NTBLCP/OE/086", "GF - NTBLCP/OE/087", "GF - NTBLCP/OE/088", "GF - NTBLCP/OE/089", "GF - NTBLCP/OE/090", "GF - NTBLCP/OE/091", "GF - NTBLCP/OE/092", "GF - NTBLCP/OE/093", "GF - NTBLCP/OE/094", "GF - NTBLCP/OE/095", "GF - NTBLCP/OE/096", "GF - NTBLCP/OE/097", "GF - NTBLCP/OE/098", "GF - NTBLCP/OE/099", "GF - NTBLCP/OE/100", "GF - NTBLCP/OE/101", "GF - NTBLCP/OE/102", "GF - NTBLCP/OE/103", "GF - NTBLCP/OE/104", "GF - NTBLCP/OE/105", "GF - NTBLCP/OE/106", "GF - NTBLCP/OE/107", "GF - NTBLCP/OE/108", "GF - NTBLCP/OE/109", "GF - NTBLCP/OE/110", "GF - NTBLCP/OE/111", "GF - NTBLCP/OE/112", "GF - NTBLCP/OE/113", "GF - NTBLCP/OE/114", "GF - NTBLCP/OE/115", "GF - NTBLCP/OE/116", "GF - NTBLCP/OE/117", "GF - NTBLCP/OE/118", "GF - NTBLCP/OE/119", "GF - NTBLCP/OE/120", "GF - NTBLCP/OE/121", "GF - NTBLCP/OE/230", "GF - NTBLCP/OE/231", "GF - NTBLCP/OE/232", "GF - NTBLCP/OE/233", "GF - NTBLCP/OE/234", "GF - NTBLCP/OE/235", "GF - NTBLCP/OE/236", "GF - NTBLCP/OE/237", "GF - NTBLCP/OE/238", "GF - NTBLCP/OE/239", "GF - NTBLCP/OE/240", "GF - NTBLCP/OE/241", "GF - NTBLCP/OE/242", "GF - NTBLCP/OE/243", "GF - NTBLCP/OE/244", "GF - NTBLCP/OE/245", "GF - NTBLCP/OE/246", "GF - NTBLCP/OE/247", "GF - NTBLCP/OE/248", "GF - NTBLCP/OE/249", "GF - NTBLCP/OE/250", "GF - NTBLCP/OE/251", "GF - NTBLCP/OE/252", "GF - NTBLCP/OE/253", "GF - NTBLCP/OE/254", "GF - NTBLCP/OE/255", "GF - NTBLCP/OE/256", "GF - NTBLCP/OE/257", "GF - NTBLCP/OE/258", "GF - NTBLCP/OE/259", "GF - NTBLCP/OE/260", "GF - NTBLCP/OE/261", "GF - NTBLCP/OE/262", "GF - NTBLCP/OE/263", "GF - NTBLCP/OE/264", "GF - NTBLCP/OE/265", "GF - NTBLCP/OE/266", "GF - NTBLCP/OE/267", "GF - NTBLCP/OE/268", "GF - NTBLCP/OE/269", "GF - NTBLCP/OE/270", "GF - NTBLCP/OE/271", "GF - NTBLCP/OE/272", "GF - NTBLCP/OE/273", "GF - NTBLCP/OE/274", "GF - NTBLCP/OE/275", "GF - NTBLCP/OE/276", "GF - NTBLCP/OE/277", "GF - NTBLCP/OE/278", "GF - NTBLCP/OE/279", "GF - NTBLCP/OE/280", "GF - NTBLCP/OE/281", "GF - NTBLCP/OE/282", "GF - NTBLCP/OE/283", "GF - NTBLCP/OE/284", "GF - NTBLCP/OE/285", "GF - NTBLCP/OE/286", "GF - NTBLCP/OE/287", "GF - NTBLCP/OE/288", "GF - NTBLCP/OE/289", "GF - NTBLCP/OE/290", "GF - NTBLCP/OE/291", "GF - NTBLCP/OE/292", "GF - NTBLCP/OE/293", "GF - NTBLCP/OE/294", "GF - NTBLCP/OE/295", "GF - NTBLCP/OE/296", "GF - NTBLCP/OE/297", "GF - NTBLCP/OE/298", "GF - NTBLCP/OE/299", "GF - NTBLCP/OE/300", "GF - NTBLCP/OE/301", "GF - NTBLCP/OE/302", "GF - NTBLCP/OE/303", "GF - NTBLCP/OE/304", "GF - NTBLCP/OE/305", "GF - NTBLCP/OE/306", "GF - NTBLCP/OE/307", "GF - NTBLCP/OE/308", "GF - NTBLCP/OE/309", "GF - NTBLCP/OE/310", "GF - NTBLCP/OE/311", "GF - NTBLCP/OE/312", "GF - NTBLCP/OE/313", "GF - NTBLCP/OE/314", "GF - NTBLCP/OE/315", "GF - NTBLCP/OE/316", "GF - NTBLCP/OE/317", "GF - NTBLCP/OE/318", "GF - NTBLCP/OE/319", "GF - NTBLCP/OE/320", "GF - NTBLCP/OE/321", "GF - NTBLCP/OE/322", "GF - NTBLCP/OE/323", "GF - NTBLCP/OE/324", "GF - NTBLCP/OE/325", "GF - NTBLCP/OE/326", "GF - NTBLCP/OE/327", "GF - NTBLCP/OE/328", "GF - NTBLCP/OE/329", "GF - NTBLCP/OE/330", "GF - NTBLCP/OE/331", "GF - NTBLCP/OE/332", "GF - NTBLCP/OE/333", "GF - NTBLCP/OE/334", "GF - NTBLCP/OE/335", "GF - NTBLCP/OE/336", "GF - NTBLCP/OE/337", "GF - NTBLCP/OE/338", "GF - NTBLCP/OE/339", "GF - NTBLCP/OE/340", "GF - NTBLCP/OE/341", "GF - NTBLCP/OE/342", "GF - NTBLCP/OE/343", "GF - NTBLCP/OE/344", "GF - NTBLCP/OE/345", "GF - NTBLCP/OE/346", "GF - NTBLCP/OE/347", "GF - NTBLCP/OE/348", "GF - NTBLCP/OE/349", "GF - NTBLCP/OE/350", "GF - NTBLCP/OE/351", "GF - NTBLCP/OE/352", "GF - NTBLCP/OE/353", "GF - NTBLCP/OE/354", "GF - NTBLCP/OE/355", "GF - NTBLCP/OE/356", "GF - NTBLCP/OE/357", "GF - NTBLCP/OE/358", "GF - NTBLCP/OE/359", "GF - NTBLCP/OE/360", "GF - NTBLCP/OE/361", "GF - NTBLCP/OE/362", "GF - NTBLCP/OE/363", "GF - NTBLCP/OE/364", "GF - NTBLCP/OE/365", "GF - NTBLCP/OE/366", "GF - NTBLCP/OE/367", "GF - NTBLCP/OE/368", "GF - NTBLCP/OE/369", "GF - NTBLCP/OE/370", "GF - NTBLCP/OE/371", "GF - NTBLCP/OE/372", "GF - NTBLCP/OE/373", "GF - NTBLCP/OE/374", "GF - NTBLCP/OE/375", "GF - NTBLCP/OE/376", "GF - NTBLCP/OE/377", "GF - NTBLCP/OE/378", "GF - NTBLCP/OE/379", "GF - NTBLCP/OE/380", "GF - NTBLCP/OE/381", "GF - NTBLCP/OE/382", "GF - NTBLCP/OE/383", "GF - NTBLCP/OE/384", "GF - NTBLCP/OE/385", "GF - NTBLCP/OE/386", "GF - NTBLCP/OE/387", "GF - NTBLCP/OE/388", "GF - NTBLCP/OE/389", "GF - NTBLCP/OE/390", "GF - NTBLCP/OE/391", "GF - NTBLCP/OE/392", "GF - NTBLCP/OE/393", "GF - NTBLCP/OE/394", "GF - NTBLCP/OE/395", "GF - NTBLCP/OE/396", "GF - NTBLCP/OE/397", "GF - NTBLCP/OE/398", "GF - NTBLCP/OE/399", "GF - NTBLCP/OE/400", "GF - NTBLCP/OE/401", "GF - NTBLCP/OE/402", "GF - NTBLCP/OE/403", "GF - NTBLCP/OE/404", "GF - NTBLCP/OE/405", "GF - NTBLCP/OE/406", "GF - NTBLCP/OE/407", "GF - NTBLCP/OE/408", "GF - NTBLCP/OE/409", "GF - NTBLCP/OE/410", "GF - NTBLCP/OE/411", "GF - NTBLCP/OE/412", "GF - NTBLCP/OE/413", "GF - NTBLCP/OE/414", "GF - NTBLCP/OE/415", "GF - NTBLCP/OE/416", "GF - NTBLCP/OE/417", "GF - NTBLCP/OE/418", "GF - NTBLCP/OE/419", "GF - NTBLCP/OE/420", "GF - NTBLCP/OE/421", "GF - NTBLCP/OE/422", "GF - NTBLCP/OE/423", "GF - NTBLCP/OE/424", "GF - NTBLCP/OE/425", "GF - NTBLCP/OE/426", "GF - NTBLCP/OE/427", "GF - NTBLCP/OE/428", "GF - NTBLCP/OE/429", "GF - NTBLCP/OE/430", "GF - NTBLCP/OE/431", "GF - NTBLCP/OE/432", "GF - NTBLCP/OE/433", "GF - NTBLCP/OE/434", "GF - NTBLCP/OE/435", "GF - NTBLCP/OE/436", "GF - NTBLCP/OE/437", "GF - NTBLCP/OE/438", "GF - NTBLCP/OE/439", "GF - NTBLCP/OE/440", "GF - NTBLCP/OE/441", "GF - NTBLCP/OE/442", "GF - NTBLCP/OE/443", "GF - NTBLCP/OE/444", "GF - NTBLCP/OE/445", "GF - NTBLCP/OE/446", "GF - NTBLCP/OE/447", "GF - NTBLCP/OE/448", "GF - NTBLCP/OE/449", "GF - NTBLCP/OE/450", "GF - NTBLCP/OE/451", "GF - NTBLCP/OE/452", "GF - NTBLCP/OE/453", "GF - NTBLCP/OE/454", "GF - NTBLCP/OE/455", "GF - NTBLCP/OE/456", "GF - NTBLCP/OE/457", "GF - NTBLCP/OE/458", "GF - NTBLCP/OE/459", "GF - NTBLCP/OE/460", "GF - NTBLCP/OE/461", "GF - NTBLCP/OE/462", "GF - NTBLCP/OE/463", "GF - NTBLCP/OE/464", "GF - NTBLCP/OE/465", "GF - NTBLCP/OE/466", "GF - NTBLCP/OE/467", "GF - NTBLCP/OE/468", "GF - NTBLCP/OE/469", "GF - NTBLCP/OE/470", "GF - NTBLCP/OE/471", "GF - NTBLCP/OE/472", "GF - NTBLCP/OE/473", "GF - NTBLCP/OE/474", "GF - NTBLCP/OE/475", "GF - NTBLCP/OE/476", "GF - NTBLCP/OE/477", "GF - NTBLCP/OE/478", "GF - NTBLCP/OE/479", "GF - NTBLCP/OE/480", "GF - NTBLCP/ITE/020", "GF - NTBLCP/ITE/006", "GF - NTBLCP/ITE/007", "GF - NTBLCP/ITE/008", "GF - NTBLCP/ITE/021", "GF - NTBLCP/ITE/023", "GF - NTBLCP/ITE/009", "GF - NTBLCP/ITE/010", "GF - NTBLCP/ITE/011", "GF - NTBLCP/ITE/012", "GF - NTBLCP/ITE/013", "GF - NTBLCP/ITE/014", "GF - NTBLCP/ITE/015", "GF - NTBLCP/ITE/016", "GF - NTBLCP/ITE/017", "GF - NTBLCP/ITE/018", "GF - NTBLCP/ITE/019", "GF - NTBLCP/OE/009", "GF - NTBLCP/OE/010", "GF - NTBLCP/OE/011", "GF - NTBLCP/OE/012", "GF - NTBLCP/OE/013", "GF - NTBLCP/OE/014", "GF - NTBLCP/OE/015", "GF - NTBLCP/OE/016", "GF - NTBLCP/OE/017", "GF - NTBLCP/OE/018", "GF - NTBLCP/OE/019", "GF - NTBLCP/OE/020", "GF - NTBLCP/OE/021", "GF - NTBLCP/OE/022", "GF - NTBLCP/OE/023", "GF - NTBLCP/OE/024", "GF - NTBLCP/OE/025", "GF - NTBLCP/OE/026", "GF - NTBLCP/OE/027", "GF - NTBLCP/OE/028", "GF - NTBLCP/OE/029", "GF - NTBLCP/OE/030", "GF - NTBLCP/OE/031", "GF - NTBLCP/OE/032", "GF - NTBLCP/OE/033", "GF - NTBLCP/OE/035", "GF - NTBLCP/OE/036", "GF - NTBLCP/OE/037", "GF - NTBLCP/OE/038", "GF - NTBLCP/OE/039", "GF - NTBLCP/OE/040A", "GF - NTBLCP/OE/040B", "GF - NTBLCP/OE/041", "GF - NTBLCP/OE/042", "GF - NTBLCP/OE/043", "GF - NTBLCP/OE/044", "GF - NTBLCP/OE/045", "GF - NTBLCP/OE/046", "GF - NTBLCP/OE/047", "GF - NTBLCP/F&F/003", "GF - NTBLCP/F&F/004", "GF - NTBLCP/F&F/003B", "GF - NTBLCP/F&F/006", "GF - NTBLCP/F&F/007", "GF - NTBLCP/F&F/008", "GF - NTBLCP/F&F/010", "GF - NTBLCP/F&F/011", "GF - NTBLCP/F&F/012", "GF - NTBLCP/F&F/013", "GF - NTBLCP/F&F/014", "GF - NTBLCP/F&F/016", "GF - NTBLCP/F&F/020", "GF - NTBLCP/F&F/021", "GF - NTBLCP/F&F/022", "GF - NTBLCP/F&F/022B", "GF - NTBLCP/F&F/024", "GF - NTBLCP/F&F/025", "GF - NTBLCP/F&F/026", "GF - NTBLCP/F&F/027", "GF - NTBLCP/F&F/029", "GF - NTBLCP/F&F/030", "GF - NTBLCP/F&F/031", "GF - NTBLCP/F&F/032", "GF - NTBLCP/F&F/033", "GF - NTBLCP/F&F/034", "GF - NTBLCP/F&F/035", "GF - NTBLCP/F&F/036", "GF - NTBLCP/F&F/037", "GF - NTBLCP/F&F/038", "GF - NTBLCP/F&F/039", "GF - NTBLCP/F&F/040", "GF - NTBLCP/F&F/041", "GF - NTBLCP/F&F/042", "GF - NTBLCP/F&F/043", "GF - NTBLCP/F&F/044", "GF - NTBLCP/F&F/045", "GF - NTBLCP/F&F/046", "GF - NTBLCP/F&F/048", "GF - NTBLCP/F&F/049", "GF - NTBLCP/F&F/050", "GF - NTBLCP/F&F/051", "GF - NTBLCP/F&F/052", "GF - NTBLCP/F&F/053", "GF - NTBLCP/F&F/054", "GF - NTBLCP/F&F/056", "GF - NTBLCP/F&F/057", "GF - NTBLCP/F&F/058", "GF - NTBLCP/ITE/024", "GF - NTBLCP/ITE/025", "GF - NTBLCP/ITE/026", "GF - NTBLCP/ITE/027", "GF - NTBLCP/ITE/028", "GF - NTBLCP/ITE/029", "GF - NTBLCP/ITE/030", "GF - NTBLCP/ITE/031", "GF - NTBLCP/ITE/032", "GF - NTBLCP/ITE/033", "GF - NTBLCP/ITE/034", "GF - NTBLCP/ITE/035", "GF - NTBLCP/ITE/037", "GF - NTBLCP/ITE/038", "GF - NTBLCP/ITE/039", "GF - NTBLCP/ITE/040", "GF - NTBLCP/ITE/041", "GF - NTBLCP/ITE/042", "GF - NTBLCP/ITE/043", "GF - NTBLCP/ITE/044", "GF - NTBLCP/ITE/045", "GF - NTBLCP/ITE/046", "GF - NTBLCP/ITE/047", "GF - NTBLCP/ITE/048", "GF - NTBLCP/ITE/049", "GF - NTBLCP/ITE/050", "GF - NTBLCP/ITE/051", "GF - NTBLCP/ITE/052", "GF - NTBLCP/ITE/053", "GF - NTBLCP/ITE/054", "GF - NTBLCP/ITE/055", "GF - NTBLCP/ITE/056", "GF - NTBLCP/ITE/057", "GF - NTBLCP/ITE/058", "GF - NTBLCP/ITE/059", "GF - NTBLCP/ITE/060", "GF - NTBLCP/ITE/062", "GF - NTBLCP/OE/481", "GF - NTBLCP/OE/482", "GF - NTBLCP/OE/483", "GF - NTBLCP/OE/484", "GF - NTBLCP/OE/485", "GF - NTBLCP/OE/486", "GF - NTBLCP/F&F/059", "GF - NTBLCP/F&F/060", "GF - NTBLCP/F&F/061", "GF - NTBLCP/F&F/062", "GF - NTBLCP/F&F/063", "GF - NTBLCP/F&F/064", "GF - NTBLCP/F&F/065", "GF - NTBLCP/F&F/066", "GF - NTBLCP/F&F/067", "GF - NTBLCP/F&F/068", "GF - NTBLCP/F&F/069", "GF - NTBLCP/F&F/070", "GF - NTBLCP/F&F/071", "GF - NTBLCP/F&F/072", "GF - NTBLCP/F&F/073", "GF - NTBLCP/F&F/074", "GF - NTBLCP/F&F/075", "GF - NTBLCP/F&F/076", "GF - NTBLCP/F&F/077", "GF - NTBLCP/F&F/078", "GF - NTBLCP/F&F/080", "GF - NTBLCP/F&F/081", "GF - NTBLCP/F&F/082", "GF - NTBLCP/F&F/083", "GF - NTBLCP/F&F/084", "GF - NTBLCP/F&F/085", "GF - NTBLCP/OE/487", "GF - NTBLCP/OE/488", "GF - NTBLCP/OE/489", "GF - NTBLCP/OE/490", "GF - NTBLCP/OE/491", "GF - NTBLCP/OE/492", "GF - NTBLCP/OE/493", "GF - NTBLCP/OE/494-A", "GF - NTBLCP/OE/494", "GF - NTBLCP/ITE/001", "GF - NTBLCP/ITE/002,", "GF - NTBLCP/ITE/003,", "GF - NTBLCP/ITE/004", "GF - NTBLCP/CE/001", "GF - NTBLCP/CE/002", "GF - NTBLCP/CE/003", "GF - NTBLCP/F&F/001", "GF - NTBLCP/F&F/002", "GF - NTBLCP/OE/004", "GF - NTBLCP/OE/005", "GF - NTBLCP/OE/006", "GF - NTBLCP/CE/005", "GF - NTBLCP/CE/006", "GF - NTBLCP/CE/007", "GF - NTBLCP/CE/008", "GF - NTBLCP/CE/009", "GF - NTBLCP/CE/010", "GF - NTBLCP/CE/011", "GF - NTBLCP/CE/012", "GF - NTBLCP/CE/013", "GF NTBLCP/CE/014", "GF - NTBLCP/CE/035", "GF - NTBLCP/CE/036", "GF - NTBLCP/CE/037", "GF - NTBLCP/CE/038", "GF - NTBLCP/CE/039", "GF - NTBLCP/CE/040", "GF - NTBLCP/CE/041", "GF - NTBLCP/CE/042", "GF - NTBLCP/CE/043", "GF - NTBLCP/CE/044", "GF - NTBLTBCP/CE/045", "GF - NTBLCP/CE/046", "GF - NTBLCP/CE/047", "GF - NTBLCP/CE/048", "GF - NTBLCP/CE/049", "GF - NTBLCP/CE/050", "GF - NTBLCP/CE/051", "GF - NTBLCP/CE/052", "GF - NTBLCP/CE/053", "GF - NTBLCP/CE/054", "GF - NTBLCP/CE/055", "GF - NTBLCP/CE/056", "GF - NTBLCP/CE/057", "GF - NTBLCP/CE/058", "GF - NTBLCP/CE/059", "GF - NTBLCP/CE/060", "GF - NTBLCP/CE/062", "GF - NTBLCP/CE/063", "GF - NTBLCP/CE/064", "GF - NTBLCP/CE/065", "GF - NTBLCP/CE/066", "GF - NTBLCP/CE/067", "GF - NTBLCP/CE/068", "GF - NTBLCP/CE/069", "GF - NTBLCP/CE/070", "GF - NTBLCP/CE/023", "GF - NTBLCP/CE/024", "GF - NTBLCP/CE/025", "GF - NTBLCP/CE/026", "GF - NTBLCP/CE/027", "GF - NTBLCP/CE/029", "GF - NTBLCP/CE/030", "GF - NTBLCP/CE/031", "GF - NTBLCP/CE/032", "GF - NTBLCP/CE/033", "GF - NTBLCP/CE/084", "GF - NTBLCP/CE/088", "GF - NTBLCP/CE/071", "GF - NTBLCP/CE/072", "GF - NTBLCP/CE/074", "GF - NTBLCP/CE/081", "GF - NTBLCP/CE/077", "GF - NTBLCP/CE/082", "GF - NTBLCP/CE/085", "GF - NTBLCP/CE/076", "GF - NTBLCP/CE/075", "GF - NTBLCP/CE/079", "GF - NTBLCP/CE/019", "GF - NTBLCP/CE/087", "GF - NTBLCP/CE/083", "GF - NTBLCP/CE/078", "GF - NTBLCP/CE/073", "GF - NTBLCP/CE/080", "GF - NTBLCP/CE/034", "AG 583 SHD", "AG 804 SHD", "GR 726 LND / AO 503 FG", "GR 727 LND / AO 505 FG", "AAA 283 BU", "AAA 285 BU", "AAA 286 BU", "GGE234CP", "GGE216CP", "GGE236CP", "AAP 869 DX", "AAP 870 DX", "AAP 8721 DX", "AAP 872 DX", "GGE 760 EC", "GGE 761 EC", "GGE 762 EC", "GGE 763 EC", "ABC 829 GR", "12 Z22FG (KUJ-420-JP)", "32 J-35FG", "32 J-36FG", "32 J-38FG", "32 J-39FG", "12R920FG", "32 J-40FG", "FG 32 Z01 (GCE-764-EC)", "FG 31 Z01 (AGL-59-CN)", "12R921FG", "BC 534 JJN"];
    const manufacturerMap = ["Locally manufactured", "Locally manufactured", "Locally manufactured", "Locally manufactured", "Locally manufactured", "Locally manufactured", "Locally manufactured", "Locally manufactured", "HP", "SHARP", "HP", "Sanyo PLC-XU4000 Multimedia Project", "Sanyo PLC-XU4000 Multimedia Project", "N/A", "N/A", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "locally manufactured", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Locally manufactured", "Blue Gate", "locally manufactured", "HP", "HP", "HP", "Kodak", "Blue Gate", "Locally manufactured", "Locally manufactured", "Locally manufactured", "Locally manufactured", "Locally manufactured", "Locally manufactured", "Intel", "Intel", "Intel", "HP", "Hp", "LG", "Mercury", "Maximum power", "GLT Solar", "Locally manufactured", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Logitech", "Canon", "Godox", "Yungteng", "Seagate", "Seagate", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Locally constructed", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Panasonic", "Cway", "Cway", "Cway", "Black+Decker", "Hisense", "Kenwood", "Bluegate", "Bluegate", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Locally Manufacured", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Transcend", "Westpoint", "Westpoint", "BlueGate", "Kico", "TP-Link", "TP-Link", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Locally Manufactured", "Scanfrost", "Scanfrost", "Scanfrost", "Scanfrost", "Scanfrost", "Scanfrost", "Scanfrost", "Scanfrost", "Scanfrost", "Mikrotik", "Ubiquiti", "HP", "HP", "HP", "Locally Produced", "Locally Produced", "Kangaro", "Kangaro", "Kangaro", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "HP", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA", "TOYOTA"];
    const modelNumberMap = ["N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "B7M13AA/DCCY", "AR5726", "CE-457A", "PLC-XU4000", "PLC-XU4000", "N/A", "N/A", "1430X", "F-407Y", "F-407Y", "F-407Y", "F-407Y", "N/A", "C5-YC12MKF", "C5-YC12MKF", "C5-YC12MKF", "C5-YC12MKF", "C5-YC12MKF", "N/A", "BG-2000", "N/A", "N/A", "N/A", "CF146A", "i1220", "B92500", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "22 - b009", "23 - b009", "24 - b009", "M402 DN", "M402 DN", "706TKRT69934", "E1806015113", "200AH-DC-12V", "12-100AH", "N/A", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "Metal Storage Shelve", "C-U0005", "EOS 800D", "TT600", "VCT-880RM", "1K9AP2-502", "1K9AP2-502", "HP Laser MFP 135w", "HP Laser MFP 135w", "HP Laser MFP 135w", "HP Laser MFP 135w", "HP Laser MFP 135w", "HP Laser MFP 135w", "HP Laser MFP 135w", "HP Laser MFP 135w", "HP Laser MFP 135w", "HP Laser MFP 135w", "ScanJet Pro 2500 f1", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "CS-YC18MFH/CU-YC18MFH", "YLR2.0-5(58B24HL)", "YLR2.0-5(58B24HL)", "YLR2.0-5(58B24HL)", "DCM600-B5", "RD-29DCA", "MWM100", "BG2500", "BG2500", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "StoreJet25M3", "WFQN-30917.D3PB", "WFQN-30917.D3PB", "BG2000", "K-WM-IP206409", "EAP110", "EAP110", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "Furniture", "SFACS18M", "SFACS18M", "SFACS18M", "SFACS18M", "SFACS18M", "SFACS18M", "SFACS18M", "SFACS18M", "SFACS18M", "N/A", "N/A", "14-dh0059nia", "14-dh0059nia", "14-dh0059nia", "N/A", "N/A", "N/A", "N/A", "N/A", "14-ba153cl", "14-ba153cl", "14-ba153cl", "14-ba153cl", "14-ba153cl", "14-ba153cl", "14-ba153cl", "14-ba153cl", "14-ba153cl", "14-ba153cl", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-cf3065nia", "14-dh1032nia", "14-dh1032nia", "14-dh1032nia", "14-dh1032nia", "14-dh1032nia", "14-dh1032nia", "14-dh1032nia", "14-dh1032nia", "14-dh1032nia", "14-dh1032nia", "14-dh1032nia", "14-dh1032nia", "HPDL 380 G10", "HPDL 380 G10", "14-dh1032nia", "14-cf2187nia", "14-cf2187nia", "14-cf2187nia", "14-cf2187nia", "14-cf2187nia", "14-cf2187nia", "14-cf2187nia", "14-cf2187nia", "14-cf2187nia", "14-cf2187nia", "14-cf2187nia", "14-cf2187nia", "14-cf2187nia", "14-cf2187nia", "2TR 8135449", "2TR 8134115", "Engine No: 2TR7085287", "Engine No: 2TR7077996", "Engine No: 2TR-7525406", "Engine No: 2TR-7543870", "Engine No: 2TR-7547967", "Engine No: 2TR-7670687", "Engine No: 2TR-7678886", "Engine No: 2TR-7671242", "Engine No: 2TR8004942", "Engine No: 2TR8004935", "Engine No: 2TR8003741", "Engine No: 2TR8005363", "Engine No: 2TR28820725", "Engine No: 2TR8012746", "Engine No: 2TR8009236", "Engine No: 2TR8004310", "Engine No: 2TR7939098", "2TR7524443", "2TR 8884813", "2TR 8870592", "2TR 8886300", "2TR 8884481", "2TR 8881675", "2TR 8884602", "2TR 8820736", "2TR 7589997", "2TR 8832659", "Engine No: 2TR8035043"];
    const serialNumberMap = ["N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "6CM2400KLZ/J1QMW2J", "1537023", "CNC-12-290403", "61Y09895", "61508907", "N/A", "N/A", "CN-OHG 3 YW -74261 - 3C6", "145100030", "145100039", "75600227", "142600725", "N/A", "7891537595", "7891538685", "7891537560", "7891538703", "7891538700", "N/A", "3ZAK120827358200256", "N/A", "CZC 32558 P4", "CZC 32558 NI", "VNC3G01614", "43955873", "B160400291", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "8CC6360QJ7", "8CC62011YW", "8CC626023K", "PHCPD09289", "PHCPF06276", "KSNC1264NA2", "AVR-5000VA", "12V-200AH", "12V100AH", "N/A", "JAAOGBJ8210488002934", "JAA0GBJ8210488003463", "JAAOGBJ8210488004981", "JAA0GBJ8210488005656", "JAA0GBJ821048800001786", "JAA0GBJ8210488003395", "JAA0GBJ8210488002934", "JAAOGBJ8210488004015", "JAA0GBJ8210488003777", "JAA0GBJ8210488005960", "JAAOGBJ8210488004598", "JAA0GBJ8210488001708", "JAA0GBJ821048800004093", "JAAOGBJ8210488002956", "JAAOGBJ8210488002732", "JAA0GBJ8210488000280", "JAAOGBJ8210488005072", "JAA0WAJ8210487005874", "JAAOGBJ8210488005072", "JAAOGBJ8210488005959", "JAAOGBJ8210488005959", "JAAOGBJ8210488002956", "JAAOGBJ8210488002732", "JAAOGBJ8210488005959", "JAAOGBJ8210488001832", "JAA0GBJ8210488000684", "JAAOGBJ8210488005803", "JAAOGBJ8210488005645", "JAA0GBJ8210488004880", "JAAOWAJ8210487003928", "JAA0GBJ821048800005133", "JAAOGBJ8220488002091", "JAAOGBJ8210488004037", "JAAOGBJ8210488001911", "JAA0WAJ8210487000385", "JAAOWAJ8210487005672", "JAA0GBJ821048800003081", "JAAOWAJ8210487005672", "JAA0GBJ8210488002293", "JAAOGG18210488005051", "JAAOGBI8210488000224", "JAA0GBJ8210488003384", "JAA0GBJ821048800004093", "JAAOGBJ8210488005689", "JAA0WAJ8210487002714", "JAA0WAJ8210487004930", "JAA0WAJ8210487001612", "JAA0WAJ8210487001522", "JAA0WAJ8210487000633", "JAA0WAJ8210487002679", "JAA0WAJ8210487002680", "JAA0WAJ8210487002545", "JAA0WAJ8210487002129", "JAA0GBJ8210488004172", "JAA0GBJ8210488002305", "JAA0WAJ8210487002523", "JAA0WAJ8210487004873", "JAA0GBJ8210488004037", "JAA0GBJ8210488005645", "JAA0GBJ8210488005858", "JAA0GBJ8210488003069", "JAA0GBJ8210488005252", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "810-001417", "393073013634", "20B22T", "0619221121", "NA9CQG8F", "NA9YF9KA", "CNB2M631G6", "CNB3N5G9S5", "CNB3N5GDNL", "CNB3N5G9S9", "CNB3N5GDNN", "CNB3N5GDNW", "CNB3N5GDNV", "CNB3N5GDNJ", "CNB3N5G9S6", "CNB3N5G9SB", "CN97NA10S6", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "JAAG0GBJ8210488000246", "JAAG3J8210488001898", "JAAOGBJ8210488006006", "JAA0GBJ8210488002990", "JAA0GBJ8210488002912", "JAA0GBJ8210488002956", "JAA0GBJ8210488003700", "JAA0GBJ8210488005937", "JAAOGBJ8210488003531", "JAA0GBJ8210488004059", "BY1189W20030013", "BY1189W20030096", "BY1189W20030131", "4860-C2181495001066", "6921727042088", "340A008850103231200448", "B160400291", "NS2003000785", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "G49136-0921", "G49136-0919", "G49136-0922", "G49136-0923", "G49136-0924", "G49136-0912", "G60450-0654", "G60450-0474", "G49136-0906", "G60450-0473", "G49136-0910", "G49136-0903", "N/A", "G49136-0917", "G49136-0920", "G49136-0925", "G60450-0653", "G49136-0908", "G60450-0656", "G49136-0915", "G60450-0657", "G49136-0901", "G49136-0902", "G49136-0913", "G60450-0467", "G49136-0904", "G60450-0460", "G49136-0918", "G60450-0459", "G60450-0655", "G49136-0916", "G60450-0651", "G49136-0914", "G49136-0907", "G60450-0652", "G61061-0591", "WD1930070246", "WD1930070022", "B170500516", "N/A", "2215Q8001278", "2215Q8001276", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "18MIN0511AF514249", "212B657200101SA010093", "2128397590501SA010116", "18MIN0610AG322826", "212b657200102SA010036", "212AB32190302SAO1003", "18MIN0610AG422908", "212B657200101SA010093", "212A143560101SA010131", "B8F80ACABFA1", "B4FBE49627F5,", "B4FBE4962A46,", "B4FBE4962931", "8CGB430DTF", "8CG8165CMR", "8CG8165F3K", "N/A", "N/A", "DP-901", "D-20", "DP-902", "8CG9313ZGR", "8CG9287F5G", "8CG9313ZG1", "8CG9313ZH2", "8CG9313ZH5", "8CG9287F7H", "8CG9313ZHY", "8CG9313ZH9", "8CG9287F9H", "8CG9313ZHR", "5CGO3521LR", "5CGO3521X4", "5CGO3521WB", "5CGO35215L", "5CGO3521XT", "5CGO3521L8", "5CGO35225C", "5CGO3521SP", "5CGO35224W", "5CGO3521LT", "5CGO35215C", "5CGO3521WQ", "5CGO3521RO", "5CGO3521RN", "5CGO3521KN", "5CGO35224X", "5CGO3521WW", "5CGO3521SB", "5CGO3521KP", "5CGO3521X3", "5CGO3521X7", "5CGO3521WX", "5CGO3521WZ", "5CGO352250", "5CGO3521LV", "5CGO3521WM", "5CGO3521PW", "5CGO3521SK", "5CGO3521S5", "5CGO3521LJ", "5CGO3521XQ", "5CGO3521X6", "5CGO3521XN", "5CGO35228H", "5CGO3521S7", "8CG0339D48", "8CG0371W3K", "8CG0339D4C", "8CG0371W1Z", "8CGO371VYP", "8CG0371VZJ", "8CGD37WZR", "8CG037238Z", "8CG0371VZG", "8CG0371W1H", "8CG037238X", "8CG0371VZM", "CZ292202LN", "CZ292202LD", "8CG03544SJ", "5CG1162709", "5CG11627HL", "5CG11627J2", "5CG1162783", "5CG11626VM", "5CG11625JN", "5CG1157FMK", "5CG1162M2W", "5CG11597CJ", "5CG11629ZX", "5CG1162957", "5CG1162LRQ", "5CG1162B1F", "5CG1162B7B", "AHTFR22G208004020", "AHTFR22G508004013", "Chassis No: AHTFX22G208011131", "Chassis No: AHTFX22G108011038", "Chassis No: AHTFX22GX08020899", "Chassis No: AHTFX22G408021479", "Chassis No: AHTFX27G008021432", "Chassis No: AHTFX 22G708024733", "Chassis No: AHTFX22G708024926", "Chassis No: AHTFX 22G008024735", "Chassis No: AHTFX 22G808029701", "Chassis No: AHTFX 22G602995", "Chassis No: AHTFX 22G408029694", "Chassis No: AHTFX 22G008029708", "Chassis No: AHTFX 22G908030274", "Chassis No: AHTFX 22G908030288", "Chassis No: AHTFX 22G408029940", "Chassis No: AHTFX 22G508029929", "Chassis No: AHTFX 22G508029168", "AHTFX22G708020858", "AHTFX22GX08031983", "AHTFX22G208031525", "AHTFX22G 908032042", "AHTFX22G 708031987", "AHTFX22G 508031891", "AHTFX22G 008031989", "AHTFX22G108030270", "AHTFX22G008022712", "AHTFX22G608030670", "Chasis No: AHTFX22G208001778"];

    const updatedAssets = assets.map(asset => {
      let isUpdated = false;
      const newAsset = { ...asset };

      if (asset.category === 'NTBLCP-TB-FAR' && asset.sn) {
          const index = parseInt(asset.sn, 10) - 1;
          if (index >= 0 && index < assigneeMap.length) {
              const fieldsToUpdate: (keyof Asset)[] = ['assignee', 'assetIdCode', 'manufacturer', 'modelNumber', 'serialNumber'];
              const dataMaps = [assigneeMap, assetIdCodeMap, manufacturerMap, modelNumberMap, serialNumberMap];

              fieldsToUpdate.forEach((field, mapIndex) => {
                  const map = dataMaps[mapIndex];
                  const value = map[index];
                  if ((newAsset[field] === 'Yes' || newAsset[field] === 'No') && value && value !== 'N/A') {
                      newAsset[field] = value;
                      isUpdated = true;
                  }
              });
          }
      }
      if (isUpdated) {
          updatedCount++;
      }
      return newAsset;
  });

  return { updatedAssets, updatedCount };
}
