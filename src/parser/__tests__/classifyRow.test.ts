import { classifyRow } from '../classifyRow';

describe('Parser Row Classifier', () => {

  it('should identify a schema header row correctly', () => {
    const row = ['S/N', 'Description', 'Location', 'Serial Number'];
    const result = classifyRow(row);
    expect(result).toBe('SCHEMA_HEADER');
  });

  it('should identify a group header row', () => {
    const row = ['EQUIPMENT', null, null];
    const result = classifyRow(row);
    expect(result).toBe('GROUP_HEADER');
  });

  it('should identify data rows with numeric first column', () => {
    const row = ['1', 'MacBook Pro', 'Lagos Store', 'SN12345'];
    const result = classifyRow(row);
    expect(result).toBe('DATA_ROW');
  });

  it('should identify data rows with high density', () => {
    const row = ['General', 'MacBook Pro', 'Lagos Store', 'SN12345'];
    const result = classifyRow(row);
    expect(result).toBe('DATA_ROW');
  });

  it('should return EMPTY for empty rows', () => {
    const row = [null, '  ', ''];
    const result = classifyRow(row);
    expect(result).toBe('EMPTY');
  });

  it('should return EMPTY for fully null rows', () => {
    const row: any[] = [];
    const result = classifyRow(row);
    expect(result).toBe('EMPTY');
  });
});
