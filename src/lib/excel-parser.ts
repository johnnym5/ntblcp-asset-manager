
import * as XLSX from 'xlsx';
import type { Asset, AppSettings, SheetDefinition, DisplayField } from '@/types/domain';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_ALIASES } from './constants';

/**
 * Normalizes a header string by trimming and converting to uppercase.
 */
const normalizeHeader = (header: any): string => {
  if (header === null || header === undefined) return '';
  return String(header).trim().toUpperCase().replace(/\s+/g, ' ');
};

/**
 * Deterministic check if a row is a header row using fuzzy overlap.
 * It compares the row against known aliases in HEADER_ALIASES.
 */
const isHeaderRow = (row: any[]): boolean => {
  if (!row || !Array.isArray(row)) return false;
  const normalizedRow = row.map(normalizeHeader);
  const knownHeaders = Object.values(HEADER_ALIASES).flat().map(normalizeHeader);
  
  const matches = normalizedRow.filter(cell => cell && knownHeaders.includes(cell)).length;
  // If at least 4 known headers match or 40% of the row matches known aliases
  return matches >= 4 || (row.length > 0 && matches / row.length >= 0.4);
};

/**
 * Detects if a row is likely a Section/Group header.
 * Sections usually have very few populated cells and are not purely numeric.
 */
const isSectionRow = (row: any[]): string | null => {
  if (!row || !Array.isArray(row)) return null;
  const populated = row.filter(c => c !== null && String(c).trim() !== '');
  
  // Rule: A section header is usually a single populated cell that isn't a known header alias
  if (populated.length === 1 && typeof populated[0] === 'string') {
    const text = populated[0].trim();
    if (text.length < 3) return null;
    if (!isNaN(Number(text))) return null;
    
    // Ensure it's not a header alias itself (like "LOCATION")
    const isHeader = Object.values(HEADER_ALIASES).flat().some(alias => normalizeHeader(alias) === normalizeHeader(text));
    if (!isHeader) return text;
  }
  return null;
};

/**
 * Template Discovery: Scans a workbook to extract unique headers and groups.
 * This does NOT import assets, only definitions.
 */
export async function discoverTemplatesFromWorkbook(file: File): Promise<SheetDefinition[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const templates: SheetDefinition[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    let foundHeaders: string[] = [];
    let discoveredGroups = new Set<string>();

    for (let i = 0; i < Math.min(data.length, 100); i++) {
      const row = data[i];
      if (isHeaderRow(row)) {
        foundHeaders = row.filter(cell => cell !== null && String(cell).trim() !== '').map(String);
      } else {
        const section = isSectionRow(row);
        if (section) discoveredGroups.add(section);
      }
    }

    if (foundHeaders.length > 0) {
      const displayFields: DisplayField[] = foundHeaders.map(h => {
        const normalized = normalizeHeader(h);
        let key: any = 'description'; // default
        for (const k in HEADER_ALIASES) {
          if (HEADER_ALIASES[k as keyof typeof HEADER_ALIASES].map(normalizeHeader).includes(normalized)) {
            key = k;
            break;
          }
        }
        return { key, label: h, table: true, quickView: true };
      });

      templates.push({
        name: sheetName,
        headers: foundHeaders,
        displayFields,
        subSheetTriggers: Array.from(discoveredGroups)
      });
    }
  }

  return templates;
}

export interface ScannedSheetInfo {
  sheetName: string;
  definitionName: string;
  rowCount: number;
  headers: string[];
  sectionsDetected: string[];
}

export async function scanExcelFile(
  fileOrBuffer: File | ArrayBuffer,
  sheetDefinitions: Record<string, SheetDefinition>,
): Promise<{ scannedSheets: ScannedSheetInfo[], errors: string[] }> {
  const scannedSheets: ScannedSheetInfo[] = [];
  const errors: string[] = [];

  try {
    const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
    const workbook = XLSX.read(buffer, { type: 'array' });

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
      
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(sheetData.length, 50); i++) {
        if (isHeaderRow(sheetData[i])) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex !== -1) {
        const headers = sheetData[headerRowIndex].filter(h => h !== null).map(String);
        const dataRows = sheetData.slice(headerRowIndex + 1);
        const sections: string[] = [];
        let dataRowCount = 0;

        dataRows.forEach(row => {
          const sec = isSectionRow(row);
          if (sec) sections.push(sec);
          else if (row.some(cell => cell !== null && String(cell).trim() !== '')) dataRowCount++;
        });

        // Best fit logic: match found headers to existing definitions
        let matchedDef = "New Category";
        const normFound = headers.map(normalizeHeader);
        for (const defName in sheetDefinitions) {
          const normDef = sheetDefinitions[defName].headers.map(normalizeHeader);
          const overlap = normFound.filter(h => normDef.includes(h)).length;
          if (overlap / normDef.length > 0.6) {
            matchedDef = defName;
            break;
          }
        }

        scannedSheets.push({
          sheetName,
          definitionName: matchedDef,
          rowCount: dataRowCount,
          headers,
          sectionsDetected: sections
        });
      }
    }
  } catch (e) {
    errors.push("Failed to scan workbook pulse.");
  }

  return { scannedSheets, errors };
}

export async function parseExcelFile(
  fileOrBuffer: File | ArrayBuffer, 
  sheetDefinitions: Record<string, SheetDefinition>, 
  existingAssets: Asset[],
  sheetsToImport: ScannedSheetInfo[]
): Promise<{ assets: Asset[], errors: string[] }> {
  const result: { assets: Asset[], errors: string[] } = { assets: [], errors: [] };

  try {
    const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    for (const { sheetName, definitionName } of sheetsToImport) {
      const sheet = workbook.Sheets[sheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      
      let headerRow: string[] = [];
      let currentSection = 'General';
      let parsing = false;

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (isHeaderRow(row)) {
          headerRow = row.map(String);
          parsing = true;
          continue;
        }

        const section = isSectionRow(row);
        if (section) {
          currentSection = section;
          continue;
        }

        if (parsing && row.some(c => c !== null && String(c).trim() !== '')) {
          const asset: any = {
            id: uuidv4(),
            category: definitionName,
            section: currentSection,
            status: 'UNVERIFIED',
            condition: 'New',
            lastModified: new Date().toISOString(),
            metadata: {}
          };

          headerRow.forEach((h, idx) => {
            const normH = normalizeHeader(h);
            const value = row[idx];
            let mapped = false;

            for (const key in HEADER_ALIASES) {
              if (HEADER_ALIASES[key as keyof typeof HEADER_ALIASES].map(normalizeHeader).includes(normH)) {
                asset[key] = value !== null ? String(value).trim() : '';
                mapped = true;
                break;
              }
            }
            if (!mapped && value !== null) asset.metadata[h] = value;
          });

          if (asset.description || asset.serialNumber) {
            result.assets.push(asset as Asset);
          }
        }
      }
    }
  } catch (e) {
    result.errors.push("Parsing sequence interrupted.");
  }
  
  return result;
}
