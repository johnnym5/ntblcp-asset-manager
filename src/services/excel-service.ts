/**
 * @fileOverview Consolidated Excel Workstation Service.
 * Phase 24: Hardened to be Header-Aware and Arrangement-Synchronized.
 * Phase 25: Enhanced for robust multi-sheet structure-preserving export.
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { parseSheetToAssets } from '@/parser/buildHierarchy';
import { HEADER_DEFINITIONS } from '@/lib/constants';
import type { Asset } from '@/types/domain';
import type { RegistryHeader } from '@/types/registry';

/**
 * Normalizes source headers for comparison.
 */
const normalizeHeader = (header: any): string => {
  if (header === null || header === undefined) return '';
  return String(header).trim().toUpperCase().replace(/\s+/g, ' ');
};

/**
 * Deterministically locates the header row index.
 */
const findHeaderRowIndex = (sheetData: any[][], definitiveHeaders: string[], startRow: number = 0): number => {
  if (!definitiveHeaders || !Array.isArray(definitiveHeaders)) return -1;
  
  const normalizedDefinitiveHeaders = definitiveHeaders.map(normalizeHeader);
  
  for (let i = startRow; i < Math.min(sheetData.length, startRow + 50); i++) {
    const row = sheetData[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    const normalizedRow = row.map(normalizeHeader);
    const matchCount = normalizedDefinitiveHeaders.filter(h => normalizedRow.includes(h)).length;
    
    // High-fidelity match threshold (70%)
    if (matchCount / normalizedDefinitiveHeaders.length >= 0.7) {
      return i;
    }
  }
  return -1;
};

export const ExcelService = {
  /**
   * Parses an Excel file into strictly-typed hierarchical assets.
   */
  async parseWorkbook(file: File): Promise<Asset[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    let allAssets: Asset[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const assets = parseSheetToAssets(data as any[][], file.name, sheetName);
      allAssets = [...allAssets, ...assets];
    }

    return allAssets;
  },

  /**
   * Generates a structure-preserving Excel report from the current registry state.
   * Respects the user's custom display names and arrangement order.
   */
  async exportRegistry(
    assets: Asset[], 
    activeHeaders?: RegistryHeader[],
    fileName: string = `Registry-Export-${new Date().toISOString().split('T')[0]}.xlsx`
  ) {
    if (!assets || assets.length === 0) {
      throw new Error("Registry is empty. No data available for export.");
    }

    const workbook = XLSX.utils.book_new();

    // Group assets by category to create separate sheets
    const grouped = assets.reduce((acc, a) => {
      const cat = a.category || 'General Register';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(a);
      return acc;
    }, {} as Record<string, Asset[]>);

    for (const [category, categoryAssets] of Object.entries(grouped)) {
      // 1. Determine Headers: Priority to User's Active Headers, fallback to Defaults
      let exportHeaders: { key: string, label: string }[] = [];
      
      if (activeHeaders && activeHeaders.length > 0) {
        // Use visible headers in their current order
        exportHeaders = activeHeaders
          .filter(h => h.visible)
          .map(h => ({
            key: h.normalizedName,
            label: h.displayName
          }));
      } else {
        // Fallback to static definitions
        const definition = HEADER_DEFINITIONS[category] || HEADER_DEFINITIONS['NTBLCP-TB-FAR'];
        if (definition && definition.headers) {
          exportHeaders = definition.headers.map(h => ({
            key: h.toLowerCase().replace(/ /g, '_'),
            label: h
          }));
        }
      }

      // 2. Map domain fields back to these headers
      const sheetData = categoryAssets.map(asset => {
        const row: Record<string, any> = {};
        
        exportHeaders.forEach(h => {
          const key = h.key;
          const label = h.label;

          // Map normalized keys to asset properties
          switch(key) {
            case 'sn': row[label] = asset.serialNumber || ''; break;
            case 'location': row[label] = asset.location || ''; break;
            case 'assignee_location': row[label] = asset.custodian || ''; break;
            case 'asset_description': row[label] = asset.description || ''; break;
            case 'asset_id_code': row[label] = asset.assetIdCode || ''; break;
            case 'asset_class': row[label] = asset.category || ''; break;
            case 'condition': row[label] = asset.condition || ''; break;
            case 'purchase_price_ngn': row[label] = asset.value || 0; break;
            case 'date_purchased_received': row[label] = asset.purchaseDate || ''; break;
            case 'serial_number': row[label] = asset.serialNumber || ''; break;
            case 'source_sheet': row[label] = asset.importMetadata?.sheetName || ''; break;
            case 'row_number': row[label] = asset.importMetadata?.rowNumber || ''; break;
            case 'section_name': row[label] = asset.section || ''; break;
            case 'subsection_name': row[label] = asset.subsection || ''; break;
            case 'status': row[label] = asset.status || ''; break;
            default:
              // Robust fallback for metadata fields
              row[label] = (asset.metadata as any)?.[label] || (asset.metadata as any)?.[key] || '';
          }
        });

        return row;
      });

      if (sheetData.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(sheetData, { 
          header: exportHeaders.map(h => h.label) 
        });
        // Sheet names limited to 31 chars
        XLSX.utils.book_append_sheet(workbook, worksheet, category.substring(0, 31));
      }
    }

    if (workbook.SheetNames.length === 0) {
      throw new Error("Workbook creation failed. No valid data found for export.");
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, fileName);
  }
};
