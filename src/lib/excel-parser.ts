import * as XLSX from 'xlsx';
import type { Asset, AppSettings, SheetDefinition, DisplayField } from './types';
import { v4 as uuidv4 } from 'uuid';
import { HEADER_ALIASES, IHVN_SUB_SHEET_DEFINITIONS } from './constants';
import { Timestamp } from 'firebase/firestore';
import { AssetSchema } from './validation/asset-schema';

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
const TEMPORAL_PATTERN = /\b(20\d{2})\b.*\b(additional|additions|procured|newly|added)\b/i;
const QUANTITY_PATTERN = /\d+\s*(pieces|pcs|units)/i;
const TRANSFER_PATTERN = /\b(transferred|transfer|dfb_| LSMOH|IHVN|FHI360)\b.*\bassets\b/i;
const DOC_HEADER_KEYWORDS = ['CONTROL PROGRAMME', 'PROJECT', 'REPORTING FORM', 'FOCAL PERSONS', 'NTBLCP', 'GENERAL'];
const MAJOR_SECTION_KEYWORDS = ['EQUIPMENT', 'COMPUTERS', 'INHERITED', 'ASSETS', 'GENERAL', 'ELECTRONICS', 'FURNITURE'];
const ASSET_FAMILY_KEYWORDS = ['CHAIRS', 'TABLES', 'CABINETS', 'SHELVES', 'LAPTOPS', 'PRINTERS', 'SCANNERS', 'AC', 'UPS', 'GENERATORS', 'VEHICLES', 'MACHINES', 'MONITORS'];

type RowType = 'document_header' | 'major_section' | 'temporal_subsection' | 'quantity_subsection' | 'transfer_section' | 'asset_family' | 'schema_header' | 'asset_row' | 'empty';

const classifyRow = (row: any[], definitiveHeaders: string[]): { type: RowType, label?: string, year?: number } => {
    const fullRowText = row.map(c => String(c || '').trim()).join(' ').toUpperCase();
    if (row.every(cell => !cell || String(cell).trim() === '')) return { type: 'empty' };

    const normalizedDefinitiveHeaders = definitiveHeaders.map(normalizeHeader);
    const normalizedRow = row.map(normalizeHeader);
    const matchCount = normalizedDefinitiveHeaders.filter(h => normalizedRow.includes(h)).length;
    
    const threshold = definitiveHeaders.length > 10 ? 0.6 : 0.7;
    if (matchCount / definitiveHeaders.length >= threshold) {
        return { type: 'schema_header' };
    }

    const temporalMatch = fullRowText.match(TEMPORAL_PATTERN);
    if (temporalMatch) {
        return { type: 'temporal_subsection', label: row.find(c => c) || fullRowText, year: parseInt(temporalMatch[1]) };
    }

    if (QUANTITY_PATTERN.test(fullRowText)) {
        return { type: 'quantity_subsection', label: row.find(c => c) || fullRowText };
    }

    if (TRANSFER_PATTERN.test(fullRowText)) {
        return { type: 'transfer_section', label: row.find(c => c) || fullRowText };
    }

    if (DOC_HEADER_KEYWORDS.some(k => fullRowText.includes(k))) {
        return { type: 'document_header', label: row.find(c => c) || fullRowText };
    }

    if (ASSET_FAMILY_KEYWORDS.some(k => fullRowText.includes(k))) {
        return { type: 'asset_family', label: row.find(c => c) || fullRowText };
    }

    if (MAJOR_SECTION_KEYWORDS.some(k => fullRowText.includes(k))) {
        return { type: 'major_section', label: row.find(c => c) || fullRowText };
    }

    const dataCellCount = row.filter(c => c && String(c).trim() !== '').length;
    if (dataCellCount > 2) {
        return { type: 'asset_row' };
    }

    return { type: 'empty' };
};

const normalizeLabel = (label: string, type: RowType): string => {
    let clean = label.toLowerCase().trim();
    if (type === 'temporal_subsection') {
        const year = clean.match(/\b(20\d{2})\b/)?.[0] || '';
        return `${year} additions`.trim();
    }
    if (type === 'quantity_subsection') {
        return clean.replace(/\s*-\s*\d+\s*(pieces|pcs|units).*/gi, '').trim() + ' batch';
    }
    if (type === 'transfer_section') {
        return clean.replace(/transferred assets|transfer/gi, '').replace(/dfb_|lsmoh|ihvn|fhi360/gi, '').replace(/[()]/g, '').trim() + ' transfer';
    }
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

export const sanitizeForFirestore = <T extends object>(obj: T): T => {
    const sanitizedObj: { [key: string]: any } = {};
    for (const key in obj) {
        const value = (obj as any)[key];
        if (key === 'previousState') continue;
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

        for (const sheetInfo of processList) {
            const sheetName = sheetInfo.sheetName;
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) continue;

            let definitionName = '';
            for (const defName in sheetDefinitions) {
                if (sheetName.toUpperCase().includes(defName.toUpperCase())) {
                    definitionName = defName;
                    break;
                }
            }
            if (!definitionName) definitionName = Object.keys(sheetDefinitions)[0];
            const currentDef = sheetDefinitions[definitionName];

            const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
            
            let context: any = {
                documentHeader: '',
                majorSection: '',
                subsectionName: '',
                assetFamily: '',
                yearBucket: undefined,
                category: definitionName,
                sourceSheet: sheetName,
            };
            let activeHeaderRow: any[] | null = null;

            for (let i = 0; i < sheetData.length; i++) {
                const row = sheetData[i];
                if (!Array.isArray(row) || row.length === 0) continue;

                let headersToMatch = currentDef.headers;
                if (definitionName === 'IHVN-GF N-THRIP') {
                    const normalizedRow = row.map(normalizeHeader);
                    for (const subDef in IHVN_SUB_SHEET_DEFINITIONS) {
                        const subHeaders = IHVN_SUB_SHEET_DEFINITIONS[subDef];
                        const subMatches = subHeaders.filter(h => normalizedRow.includes(normalizeHeader(h))).length;
                        if (subMatches / subHeaders.length >= 0.7) {
                            headersToMatch = subHeaders;
                            context.majorSection = subDef;
                            break;
                        }
                    }
                }

                const classification = classifyRow(row, headersToMatch);

                switch (classification.type) {
                    case 'document_header':
                        context.documentHeader = classification.label!;
                        break;
                    case 'major_section':
                        context.majorSection = classification.label!;
                        context.subsectionName = '';
                        context.assetFamily = '';
                        break;
                    case 'temporal_subsection':
                        context.subsectionName = classification.label!;
                        context.yearBucket = classification.year;
                        context.rawLabel = classification.label;
                        context.normalizedLabel = normalizeLabel(classification.label!, 'temporal_subsection');
                        break;
                    case 'transfer_section':
                        context.subsectionName = classification.label!;
                        context.rawLabel = classification.label;
                        context.normalizedLabel = normalizeLabel(classification.label!, 'transfer_section');
                        break;
                    case 'quantity_subsection':
                        context.assetFamily = classification.label!;
                        context.rawLabel = classification.label;
                        context.normalizedLabel = normalizeLabel(classification.label!, 'quantity_subsection');
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

                            const validation = AssetSchema.safeParse(parsed);
                            if (!validation.success) {
                                result.errors.push(`Row ${i + 1} (${sheetName}): ${validation.error.errors[0].message}`);
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
                        bestMatch = { definitionName: defName, headerRowIndex: i, score: score, headers: row.filter(h => h) };
                    }
                }
            }

            if (bestMatch) {
                scannedSheets.push({
                    sheetName,
                    definitionName: bestMatch.definitionName,
                    rowCount: sheetData.length,
                    headers: bestMatch.headers,
                });
            }
        }
    } catch (e) {
        errors.push(e instanceof Error ? e.message : "Scanning failed.");
    }

    return { scannedSheets, errors };
}

export async function exportToExcel(assets: Asset[], sheetDefinitions: Record<string, SheetDefinition>, fileName: string): Promise<void> {
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
        
        // Add hierarchical metadata columns for future parity
        if (!headerArray.includes("Major Section")) headerArray.push("Major Section");
        if (!headerArray.includes("Subsection")) headerArray.push("Subsection");
        if (!headerArray.includes("Addition Year")) headerArray.push("Addition Year");
        if (!headerArray.includes("Verified Status")) headerArray.push("Verified Status");
        if (!headerArray.includes("Verified Date")) headerArray.push("Verified Date");

        const sheetData = assetsByCategory[category].map(asset => {
            const row: Record<string, unknown> = {};
            headerArray.forEach(header => {
                const normalizedHeader = normalizeHeader(header);
                
                if (normalizedHeader === 'MAJOR SECTION') row[header] = asset.majorSection || '';
                else if (normalizedHeader === 'SUBSECTION') row[header] = asset.subsectionName || '';
                else if (normalizedHeader === 'ADDITION YEAR') row[header] = asset.yearBucket || '';
                else if (normalizedHeader === 'VERIFIED STATUS') row[header] = asset.verifiedStatus || 'Unverified';
                else if (normalizedHeader === 'VERIFIED DATE') row[header] = asset.verifiedDate || '';
                else {
                    let assetKey: keyof Asset | undefined;
                    for (const key in HEADER_ALIASES) {
                        if (HEADER_ALIASES[key as keyof typeof HEADER_ALIASES]?.map(normalizeHeader).includes(normalizedHeader)) {
                            assetKey = key as keyof Asset;
                            break;
                        }
                    }
                    if (assetKey) row[header] = asset[assetKey] ?? '';
                }
            });
            return row;
        });
        
        const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: headerArray });
        XLSX.utils.book_append_sheet(workbook, worksheet, category.substring(0, 31));
    }

    XLSX.writeFile(workbook, fileName);
}

export async function parseExcelForTemplate(file: File): Promise<SheetDefinition[]> {
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
