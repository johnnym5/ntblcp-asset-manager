/**
 * @fileOverview Consolidated Excel Workstation Service.
 * Orchestrates hierarchical parsing and structure-preserving exports.
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { parseSheetToAssets } from '@/parser/buildHierarchy';
import { HEADER_DEFINITIONS } from '@/lib/constants';
import type { Asset } from '@/types/domain';

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
   */
  async exportRegistry(assets: Asset[], fileName: string = 'Registry-Export.xlsx') {
    const workbook = XLSX.utils.book_new();

    // Group assets by category to create separate sheets
    const grouped = assets.reduce((acc, a) => {
      const cat = a.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(a);
      return acc;
    }, {} as Record<string, Asset[]>);

    for (const [category, categoryAssets] of Object.entries(grouped)) {
      // Get the canonical headers for this category
      const definition = HEADER_DEFINITIONS[category] || HEADER_DEFINITIONS['NTBLCP-TB-FAR'];
      const headers = [...definition.headers];

      // Add hierarchical metadata columns if missing
      const metaHeaders = ['Section', 'Subsection', 'Asset Family', 'Verified Status', 'Condition'];
      metaHeaders.forEach(h => { if (!headers.includes(h)) headers.push(h); });

      const sheetData = categoryAssets.map(asset => {
        const row: Record<string, any> = {};
        
        // Map domain fields back to canonical headers
        headers.forEach(h => {
          const upper = h.toUpperCase();
          if (upper.includes('DESCRIPTION')) row[h] = asset.description;
          else if (upper.includes('SERIAL') || upper === 'S/N') row[h] = asset.serialNumber;
          else if (upper.includes('TAG') || upper.includes('ID CODE')) row[h] = asset.assetIdCode;
          else if (upper.includes('LOCATION') || upper === 'STATE') row[h] = asset.location;
          else if (upper.includes('ASSIGNEE') || upper === 'CUSTODIAN') row[h] = asset.custodian;
          else if (h === 'Section') row[h] = asset.section;
          else if (h === 'Subsection') row[h] = asset.subsection;
          else if (h === 'Asset Family') row[h] = asset.assetFamily;
          else if (h === 'Verified Status') row[h] = asset.status;
          else if (h === 'Condition') row[h] = asset.condition;
          else row[h] = (asset.metadata as any)[upper] || '';
        });

        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: headers });
      XLSX.utils.book_append_sheet(workbook, worksheet, category.substring(0, 31));
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, fileName);
  }
};
