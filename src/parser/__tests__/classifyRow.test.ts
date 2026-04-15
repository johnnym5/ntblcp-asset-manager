import { classifyRow } from '../classifyRow';

describe('Parser Row Classifier', () => {
  const definitiveHeaders = ['S/N', 'DESCRIPTION', 'LOCATION', 'SERIAL NUMBER'];

  it('should identify a schema header row correctly', () => {
    const row = ['S/N', 'Description', 'Location', 'Serial Number'];
    const result = classifyRow(row, definitiveHeaders);
    expect(result.type).toBe('SCHEMA_HEADER');
  });

  it('should identify a major section row', () => {
    const row = ['EQUIPMENT', null, null];
    const result = classifyRow(row, definitiveHeaders);
    expect(result.type).toBe('MAJOR_SECTION');
    expect(result.label).toBe('EQUIPMENT');
  });

  it('should identify temporal subsections', () => {
    const row = ['2024 ADDITIONAL ASSETS', null, null];
    const result = classifyRow(row, definitiveHeaders);
    expect(result.type).toBe('TEMPORAL_SUBSECTION');
    expect(result.year).toBe(2024);
  });

  it('should identify quantity batches', () => {
    const row = ['50 Pieces of Laptops', null, null];
    const result = classifyRow(row, definitiveHeaders);
    expect(result.type).toBe('QUANTITY_BATCH');
  });

  it('should identify data rows', () => {
    const row = ['1', 'MacBook Pro', 'Lagos Store', 'SN12345'];
    const result = classifyRow(row, definitiveHeaders);
    expect(result.type).toBe('DATA_ROW');
  });

  it('should return EMPTY for empty rows', () => {
    const row = [null, '  ', ''];
    const result = classifyRow(row, definitiveHeaders);
    expect(result.type).toBe('EMPTY');
  });
});
