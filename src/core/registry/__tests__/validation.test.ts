import { validateAsset } from '../validation';

describe('Asset Data Validation', () => {
  const validAsset = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Asset',
    description: 'A reliable test asset',
    category: 'IT Equipment',
    location: 'Lagos',
    status: 'UNVERIFIED',
    last_modified: new Date().toISOString(),
    last_modified_by: 'Admin',
    hierarchy: {
      document: 'Main.xlsx',
      section: 'IT',
      subsection: 'Base',
      asset_family: 'Laptops'
    },
    import_metadata: {
      source_file: 'Main.xlsx',
      sheet_name: 'IT',
      row_number: 10,
      imported_at: new Date().toISOString()
    },
    metadata: {}
  };

  it('should pass validation for a complete asset object', () => {
    expect(() => validateAsset(validAsset)).not.toThrow();
  });

  it('should fail validation if required fields are missing', () => {
    const invalidAsset = { ...validAsset };
    delete (invalidAsset as any).name;
    expect(() => validateAsset(invalidAsset)).toThrow();
  });

  it('should fail validation for incorrect status values', () => {
    const invalidAsset = { ...validAsset, status: 'UNKNOWN_STATUS' };
    expect(() => validateAsset(invalidAsset)).toThrow();
  });

  it('should correctly parse and transform purchase dates', () => {
    const assetWithDate = { ...validAsset, purchase_date: '2023-01-01' };
    const validated = validateAsset(assetWithDate);
    expect(validated.purchase_date).toBe('2023-01-01');
  });
});
