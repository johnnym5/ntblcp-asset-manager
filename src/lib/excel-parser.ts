import * as XLSX from 'xlsx';
import type { Asset, AppSettings, SheetDefinition } from '@/types/domain';
import { HEADER_ALIASES } from './constants';
import { ParserEngine } from '@/parser/engine';
import { normalizeHeaderName } from './registry-utils';
import { sanitizeForFirestore } from './utils';

/**
 * @fileOverview Excel Ingestion Layer.
 * Reverted to workbook-centric multi-sheet processing.
 * Phase 1105: Each sheet is treated as an independent folder.
 */

export { sanitizeForFirestore };

export interface ScannedSheetInfo {
  sheetName: string;
  rowCount: number;
  groupCount: number;
  headers: string[];
  definitionName?: string;
}

/**
 * Scans a workbook and identifies sheets containing asset data.
 */
export async function scanExcelFile(
  fileOrBuffer: File | ArrayBuffer,
  appSettings: AppSettings,
): Promise<{ scannedSheets: ScannedSheetInfo[], errors: string[] }> {
    const scannedSheets: ScannedSheetInfo[] = [];
    const errors: string[] = [];

    try {
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const engine = new ParserEngine(fileOrBuffer instanceof File ? fileOrBuffer.name : 'Workbook');

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
          
          const groups = engine.discoverGroups(sheetName, sheetData);
          if (groups.length > 0) {
            scannedSheets.push({
              sheetName: sheetName,
              rowCount: groups[0].rowCount,
              groupCount: 1,
              headers: groups[0].headerSet,
              definitionName: sheetName
            });
          }
        }

        if (scannedSheets.length === 0) {
            errors.push("No compatible asset sheets discovered in this workbook.");
        }

    } catch (e) {
        console.error("Error scanning Excel pulse:", e);
        errors.push(e instanceof Error ? e.message : "An unknown error occurred during scanning.");
    }

    return { scannedSheets, errors };
}

/**
 * Parses all selected sheets into domain assets.
 */
export async function parseExcelFile(
    fileOrBuffer: File | ArrayBuffer, 
    sheetDefinitions: Record<string, SheetDefinition>, 
    existingAssets: Asset[],
    sheetsToImport?: ScannedSheetInfo[]
): Promise<{ assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] }> {
    const result: { assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] } = {
        assets: [],
        updatedAssets: [],
        skipped: 0,
        errors: [],
    };
    
    try {
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const fileName = fileOrBuffer instanceof File ? fileOrBuffer.name : 'Ingested Workbook';
        const engine = new ParserEngine(fileName, existingAssets);

        const targetSheets = sheetsToImport || workbook.SheetNames.map((s: string) => ({ sheetName: s }));

        for (const { sheetName } of targetSheets) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;

          const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
          const groupContainers = engine.parseWorkbook(sheetName, data);
          
          groupContainers.flatMap(c => c.assets).forEach(asset => {
            if (asset.validation.isUpdate) {
              result.updatedAssets.push(asset as any);
            } else {
              result.assets.push(asset as any);
            }
          });
        }

    } catch (e) {
        console.error("Error parsing Excel pulse:", e);
        result.errors.push(e instanceof Error ? e.message : "Deterministic parsing failed.");
    }
    
    return result;
}

/**
 * Extracts folder templates from a multi-sheet workbook.
 */
export async function parseExcelForTemplate(file: File): Promise<SheetDefinition[]> {
  const templates: SheetDefinition[] = [];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const engine = new ParserEngine(file.name);

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const groups = engine.discoverGroups(sheetName, sheetData);

    if (groups.length > 0) {
      const group = groups[0];
      const displayFields = group.headerSet.map(h => {
          const key = normalizeHeaderName(h);
          const isIdentification = ['sn', 'description', 'location', 'asset_id_code', 'serial_number'].includes(key);
          return {
              key: key as keyof Asset,
              label: h,
              table: isIdentification,
              quickView: true,
              inChecklist: isIdentification
          };
      });

      templates.push({
          name: sheetName,
          headers: group.headerSet,
          displayFields
      });
    }
  }

  if (templates.length === 0) {
    throw new Error("Could not find any structural nodes in the primary sheet.");
  }

  return templates;
}
