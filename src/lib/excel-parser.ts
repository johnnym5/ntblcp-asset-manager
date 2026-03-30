import type { Asset, SheetDefinition, DisplayField, AppSettings } from './types';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_ALIASES, IHVN_SUB_SHEET_DEFINITIONS } from './constants';
import { Timestamp } from 'firebase/firestore';
import { AssetSchema } from './validation/asset-schema';
import { sanitizeForFirestore } from './utils';

/**
 * Normalizes a header string by trimming and converting to uppercase.
 */
const normalizeHeader = (header: unknown): string => {
    if (header === null || header === undefined) return '';
    return String(header).trim().toUpperCase().replace(/\s+/g, ' ');
};

/**
 * Patterns for hierarchical classification
 */
const TEMPORAL_PATTERN = /\b(20\d{2})\b.*\b(additional|additions|procured|newly)\b/i;
const QUANTITY_PATTERN = /\d+\s*(pieces|pcs|units)/i;
const TRANSFER_PATTERN = /\b(transferred|transfer)\b/i;
const DOC_HEADER_KEYWORDS = ['CONTROL PROGRAMME', 'PROJECT', 'REPORTING FORM', 'FOCAL PERSONS'];
const MAJOR_SECTION_KEYWORDS = ['EQUIPMENT', 'COMPUTERS', 'INHERITED', 'ASSETS', 'GENERAL'];
const ASSET_FAMILY_KEYWORDS = ['CHAIRS', 'TABLES', 'CABINETS', 'SHELVES', 'LAPTOPS', 'PRINTERS', 'SCANNERS', 'AC', 'UPS', 'GENERATORS', 'VEHICLES', 'MACHINES'];

/**
 * Classification Utility
 */
type RowType = 'document_header' | 'major_section' | 'temporal_subsection' | 'quantity_subsection' | 'transfer_section' | 'asset_family' | 'schema_header' | 'asset_row' | 'empty';

const classifyRow = (row: any[], definitiveHeaders: string[]): { type: RowType, label?: string, year?: number } => {
    const firstCell = String(row[0] || '').trim();
    const fullRowText = row.map(c => String(c || '').trim()).join(' ').toUpperCase();
    
    if (row.every(cell => !cell || String(cell).trim() === '')) return { type: 'empty' };

    // RULE B: SCHEMA HEADER ROWS
    const normalizedDefinitiveHeaders = definitiveHeaders.map(normalizeHeader);
    const normalizedRow = row.map(normalizeHeader);
    const matchCount = normalizedDefinitiveHeaders.filter(h => normalizedRow.includes(h)).length;
    if (matchCount / definitiveHeaders.length >= 0.6) {
        return { type: 'schema_header' };
    }

    // RULE C: TEMPORAL SUBSECTIONS
    const temporalMatch = firstCell.match(TEMPORAL_PATTERN);
    if (temporalMatch) {
        return { type: 'temporal_subsection', label: firstCell, year: parseInt(temporalMatch[1]) };
    }

    // RULE D: QUANTITY BATCH
    if (QUANTITY_PATTERN.test(firstCell)) {
        return { type: 'quantity_subsection', label: firstCell };
    }

    // RULE E: TRANSFER
    if (TRANSFER_PATTERN.test(firstCell)) {
        return { type: 'transfer_section', label: firstCell };
    }

    // RULE A: DOC HEADERS (Priority keywords or very top centered text)
    if (DOC_HEADER_KEYWORDS.some(k => fullRowText.includes(k))) {
        return { type: 'document_header', label: firstCell };
    }

    // RULE G: ASSET FAMILY
    if (ASSET_FAMILY_KEYWORDS.some(k => fullRowText.includes(k))) {
        return { type: 'asset_family', label: firstCell };
    }

    // RULE F: MAJOR SECTIONS
    if (MAJOR_SECTION_KEYWORDS.some(k => fullRowText.includes(k))) {
        return { type: 'major_section', label: firstCell };
    }

    // Fallback: If we have multiple columns filled, it might be an asset row if a schema is active
    const dataCellCount = row.filter(c => c && String(c).trim() !== '').length;
    if (dataCellCount > 2) {
        return { type: 'asset_row' };
    }

    return { type: 'empty' };
};

const normalizeLabel = (label: string, type: RowType): string => {
    let clean = label.toLowerCase().trim();
    if (type === 'temporal_subsection') return clean.replace(/additional assets|additions/g, 'additions').trim();
    if (type === 'quantity_subsection') return clean.replace(/pieces|pcs|units/g, 'batch').trim();
    if (type === 'transfer_section') return clean.replace(/dfb_|transferred assets/g, 'transfer').trim();
    return clean;
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

/**
 * Parses a single Excel row into an Asset object based on context and headers.
 */
const parseAssetRow = (row: any[], headerRow: any[], context: any): Partial<Asset> => {
    const assetObject: Partial<Asset> = { 
        ...context,
        verifiedStatus: 'Unverified',
    };
    
    headerRow.forEach((rawHeader, colIndex) => {
        if (!rawHeader) return;
        const normalizedHeader = normalizeHeader(rawHeader);
        const fieldName = COLUMN_TO_ASSET_FIELD_MAP.get(normalizedHeader);
        
        if (fieldName) {
            const cell = row[colIndex];
            const finalValue = (cell !== null && cell !== undefined && typeof cell === 'object' && 'w' in cell) 
                ? String((cell as any).w).trim() 
                : (cell !== null && cell !== undefined ? String(cell).trim() : null);

            if (finalValue) {
                (assetObject as any)[fieldName] = finalValue;
            }
        }
    });

    return assetObject;
};

export async function parseExcelFile(
    fileOrBuffer: File | ArrayBuffer, 
    sheetDefinitions: Record<string, SheetDefinition>,
    lockAssetList: boolean,
    existingAssets: Asset[],
    sheetsToImport?: any[]
): Promise<{ assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] }> {
    
    const result: { assets: Asset[], updatedAssets: Asset[], skipped: number, errors: string[] } = {
        assets: [],
        updatedAssets: [],
        skipped: 0,
        errors: [],
    };

    try {
        const XLSX = await import('xlsx');
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellText: false });

        const processList = sheetsToImport || workbook.SheetNames.map(name => ({ sheetName: name }));

        for (const { sheetName } of processList) {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) continue;

            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            
            // Hierarchy State Machine
            let context = {
                documentHeader: '',
                majorSection: '',
                subsectionName: '',
                assetFamily: '',
                yearBucket: undefined as number | undefined,
                category: sheetName,
                sourceSheet: sheetName,
            };
            let activeHeaderRow: any[] | null = null;
            let currentDef: SheetDefinition | null = null;

            for (let i = 0; i < sheetData.length; i++) {
                const row = sheetData[i];
                if (!Array.isArray(row) || row.length === 0) continue;

                // Try to find a matching definition for this sheet if not already found
                if (!currentDef) {
                    for (const defName in sheetDefinitions) {
                        if (sheetName.toUpperCase().includes(defName.toUpperCase())) {
                            currentDef = sheetDefinitions[defName];
                            break;
                        }
                    }
                    if (!currentDef) currentDef = Object.values(sheetDefinitions)[0]; // Fallback to first
                }

                const classification = classifyRow(row, currentDef.headers);

                switch (classification.type) {
                    case 'document_header':
                        context.documentHeader = classification.label!;
                        break;
                    case 'major_section':
                        context.majorSection = classification.label!;
                        context.subsectionName = ''; // Reset subsections on major break
                        context.assetFamily = '';
                        break;
                    case 'temporal_subsection':
                        context.subsectionName = classification.label!;
                        context.yearBucket = classification.year;
                        break;
                    case 'transfer_section':
                        context.subsectionName = classification.label!;
                        break;
                    case 'quantity_subsection':
                        context.assetFamily = classification.label!;
                        break;
                    case 'asset_family':
                        context.assetFamily = classification.label!;
                        break;
                    case 'schema_header':
                        activeHeaderRow = row;
                        break;
                    case 'asset_row':
                        if (activeHeaderRow) {
                            const parsed = parseAssetRow(row, activeHeaderRow, context);
                            parsed.sourceRow = i + 1;
                            parsed.originalRowData = JSON.stringify(row);
                            parsed.rawLabel = context.subsectionName || context.majorSection;
                            parsed.normalizedLabel = normalizeLabel(parsed.rawLabel || '', classification.type);

                            // Validation
                            const validation = AssetSchema.safeParse(parsed);
                            if (!validation.success) {
                                result.errors.push(`Row ${i + 1}: ${validation.error.errors[0].message}`);
                                continue;
                            }

                            const asset = validation.data as Asset;
                            const assetKey = `${asset.sn || ''}-${asset.assetIdCode || ''}-${asset.description || ''}`.toLowerCase();
                            
                            const existing = existingAssets.find(a => 
                                `${a.sn || ''}-${a.assetIdCode || ''}-${a.description || ''}`.toLowerCase() === assetKey
                            );

                            if (existing) {
                                if (JSON.stringify(existing) !== JSON.stringify({ ...existing, ...asset })) {
                                    result.updatedAssets.push(sanitizeForFirestore({ ...existing, ...asset }));
                                } else {
                                    result.skipped++;
                                }
                            } else if (!lockAssetList) {
                                result.assets.push(sanitizeForFirestore({ ...asset, id: uuidv4() }));
                            } else {
                                result.skipped++;
                            }
                        }
                        break;
                }
            }
        }
    } catch (e) {
        result.errors.push(e instanceof Error ? e.message : "Parsing failed.");
    }
    
    return result;
}

export async function scanExcelFile(
  fileOrBuffer: File | ArrayBuffer,
  sheetDefinitions: Record<string, SheetDefinition>,
): Promise<{ scannedSheets: any[], errors: string[] }> {
    const scannedSheets: any[] = [];
    const errors: string[] = [];

    try {
        const XLSX = await import('xlsx');
        const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            
            let bestMatch: any = null;

            for (const defName in sheetDefinitions) {
                const definition = sheetDefinitions[defName];
                const normalizedDefinitiveHeaders = definition.headers.map(normalizeHeader);
                
                for (let i = 0; i < Math.min(sheetData.length, 50); i++) {
                    const row = sheetData[i];
                    if (!Array.isArray(row)) continue;

                    const normalizedRow = row.map(normalizeHeader);
                    const matchCount = normalizedDefinitiveHeaders.filter(h => normalizedRow.includes(h)).length;
                    const score = matchCount / normalizedDefinitiveHeaders.length;

                    if (score >= 0.6 && (!bestMatch || score > bestMatch.score)) {
                        bestMatch = { definitionName: defName, headerRowIndex: i, score: score };
                    }
                }
            }

            if (bestMatch) {
                scannedSheets.push({
                    sheetName,
                    definitionName: bestMatch.definitionName,
                    rowCount: sheetData.length,
                    headers: sheetData[bestMatch.headerRowIndex],
                });
            }
        }
    } catch (e) {
        errors.push(e instanceof Error ? e.message : "Scanning failed.");
    }

    return { scannedSheets, errors };
}

export async function exportToExcel(assets: Asset[], sheetDefinitions: Record<string, SheetDefinition>, fileName: string): Promise<void> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    const assetsByCategory = assets.reduce((acc, asset) => {
        const category = asset.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(asset);
        return acc;
    }, {} as Record<string, Asset[]>);
    
    for (const category in assetsByCategory) {
        const definition = sheetDefinitions[category];
        if (!definition) continue;

        const headerArray = [...definition.headers];
        const sheetData = assetsByCategory[category].map(asset => {
            const row: Record<string, unknown> = {};
            headerArray.forEach(header => {
                const normalizedHeader = normalizeHeader(header);
                let assetKey: keyof Asset | undefined;
                for (const key in HEADER_ALIASES) {
                    if (HEADER_ALIASES[key as keyof typeof HEADER_ALIASES]?.map(normalizeHeader).includes(normalizedHeader)) {
                        assetKey = key as keyof Asset;
                        break;
                    }
                }
                if (assetKey) row[header] = asset[assetKey] ?? '';
            });
            return row;
        });
        
        const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: headerArray });
        XLSX.utils.book_append_sheet(workbook, worksheet, category.substring(0, 31));
    }

    XLSX.writeFile(workbook, fileName);
}

export async function parseExcelForTemplate(file: File): Promise<SheetDefinition[]> {
  const XLSX = await import('xlsx');
  const templates: SheetDefinition[] = [];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    for (let i = 0; i < Math.min(sheetData.length, 25); i++) {
        const row = sheetData[i];
        if (!Array.isArray(row)) continue;
        const normalizedRow = row.map(normalizeHeader);
        const matchCount = normalizedRow.filter(h => {
            for(const key in HEADER_ALIASES) {
                if(HEADER_ALIASES[key as keyof typeof HEADER_ALIASES].map(normalizeHeader).includes(h)) return true;
            }
            return false;
        }).length;

        if (matchCount > 5) {
            const headerRow = row.map(h => String(h || '').trim()).filter(h => h);
            const displayFields: DisplayField[] = headerRow.map(header => {
                const normalizedHeader = normalizeHeader(header);
                let fieldKey: keyof Asset | undefined;
                for (const key in HEADER_ALIASES) {
                    if (HEADER_ALIASES[key as keyof typeof HEADER_ALIASES]?.map(normalizeHeader).includes(normalizedHeader)) {
                        fieldKey = key as keyof Asset;
                        break;
                    }
                }
                return fieldKey ? { key: fieldKey, label: header, table: true, quickView: true } : null;
            }).filter((f): f is DisplayField => f !== null);

            templates.push({ name: sheetName, headers: headerRow, displayFields });
            break; 
        }
    }
  }
  return templates;
}
