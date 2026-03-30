/**
 * @fileOverview Deterministic Row Classifier.
 * Classifies spreadsheet rows based on structural rules and keyword signatures.
 */

export type RowType = 
  | 'SCHEMA_HEADER' 
  | 'MAJOR_SECTION' 
  | 'TEMPORAL_SUBSECTION' 
  | 'QUANTITY_BATCH' 
  | 'TRANSFER_SECTION' 
  | 'DATA_ROW' 
  | 'EMPTY' 
  | 'UNKNOWN';

const TEMPORAL_PATTERN = /\b(20\d{2})\b.*\b(additional|additions|procured|newly|added)\b/i;
const QUANTITY_PATTERN = /\d+\s*(pieces|pcs|units)/i;
const TRANSFER_PATTERN = /\b(transferred|transfer)\b.*\bassets\b/i;

const MAJOR_SECTION_KEYWORDS = ['EQUIPMENT', 'COMPUTERS', 'INHERITED', 'ASSETS', 'GENERAL', 'ELECTRONICS', 'FURNITURE'];

export function classifyRow(row: any[], definitiveHeaders: string[]): { type: RowType; label?: string; year?: number } {
  if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) {
    return { type: 'EMPTY' };
  }

  const fullRowText = row.map(c => String(c || '').trim()).join(' ').toUpperCase();
  const firstCell = String(row[0] || '').trim().toUpperCase();

  // 1. Check for Schema Header (Deterministic intersection)
  const normalizedRow = row.map(c => String(c || '').trim().toUpperCase());
  const normalizedDefinitive = definitiveHeaders.map(h => h.toUpperCase());
  const matches = normalizedRow.filter(h => normalizedDefinitive.includes(h)).length;
  
  if (definitiveHeaders.length > 0 && matches / definitiveHeaders.length >= 0.7) {
    return { type: 'SCHEMA_HEADER' };
  }

  // 2. Temporal Subsections (e.g. "2024 ADDITIONAL ASSETS")
  const temporalMatch = fullRowText.match(TEMPORAL_PATTERN);
  if (temporalMatch) {
    return { type: 'TEMPORAL_SUBSECTION', label: String(row.find(c => c) || fullRowText), year: parseInt(temporalMatch[1]) };
  }

  // 3. Quantity Batches (e.g. "10 Pieces of Chairs")
  if (QUANTITY_PATTERN.test(fullRowText)) {
    return { type: 'QUANTITY_BATCH', label: String(row.find(c => c) || fullRowText) };
  }

  // 4. Transfer Sections
  if (TRANSFER_PATTERN.test(fullRowText)) {
    return { type: 'TRANSFER_SECTION', label: String(row.find(c => c) || fullRowText) };
  }

  // 5. Major Sections (Usually single cell or specific keywords)
  if (MAJOR_SECTION_KEYWORDS.some(k => fullRowText === k || (firstCell === k && row.filter(c => c).length === 1))) {
    return { type: 'MAJOR_SECTION', label: firstCell };
  }

  // 6. Data Rows (Multiple populated columns, doesn't match headers)
  const populatedCells = row.filter(c => c && String(c).trim() !== '').length;
  if (populatedCells > 2) {
    return { type: 'DATA_ROW' };
  }

  return { type: 'UNKNOWN' };
}
