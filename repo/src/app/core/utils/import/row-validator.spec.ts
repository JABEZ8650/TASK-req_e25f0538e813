import { validateRow, validateAllRows, FieldMapping } from './row-validator';

describe('validateRow', () => {
  const mappings: FieldMapping[] = [
    { sourceColumn: 'title', targetField: 'role' },
    { sourceColumn: 'pay', targetField: 'salary' },
    { sourceColumn: 'tech', targetField: 'skills' },
    { sourceColumn: 'id', targetField: null },
  ];

  it('should normalize mapped fields', () => {
    const row = validateRow(0, { title: 'Engineer', pay: '$120000', tech: 'js, python', id: '1' }, mappings);
    expect(row.fields.find(f => f.key === 'role')?.value).toBe('Engineer');
    expect(row.fields.find(f => f.key === 'salary')?.value).toBe('120000 USD');
    expect(row.fields.find(f => f.key === 'skills')?.value).toBe('JavaScript, Python');
  });

  it('should preserve unmapped fields with flag', () => {
    const row = validateRow(0, { title: 'Eng', pay: '100000', tech: 'go', id: '42' }, mappings);
    const unmapped = row.fields.find(f => f.key === 'id');
    expect(unmapped).toBeTruthy();
    expect(unmapped!.normalized).toBe(false);
    expect(unmapped!.flagged).toBeTruthy();
  });

  it('should flag empty required fields', () => {
    const row = validateRow(0, { title: '', pay: '100000', tech: 'js', id: '1' }, mappings);
    const role = row.fields.find(f => f.key === 'role');
    expect(role?.flagged).toBeTruthy();
    expect(row.errors.length).toBeGreaterThan(0);
  });

  it('should be accepted by default', () => {
    const row = validateRow(0, { title: 'X', pay: '1', tech: 'a', id: '1' }, mappings);
    expect(row.accepted).toBe(true);
  });
});

describe('validateAllRows', () => {
  it('should validate multiple rows', () => {
    const mappings: FieldMapping[] = [{ sourceColumn: 'name', targetField: 'role' }];
    const records = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
    const results = validateAllRows(records, mappings);
    expect(results.length).toBe(3);
    expect(results[0].rowIndex).toBe(0);
    expect(results[2].rowIndex).toBe(2);
  });
});
