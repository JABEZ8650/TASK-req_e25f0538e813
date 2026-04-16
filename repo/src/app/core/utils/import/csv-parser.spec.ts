import { parseCsv, csvToRecords } from './csv-parser';

describe('parseCsv', () => {
  it('should parse simple CSV rows', () => {
    const rows = parseCsv('a,b,c\n1,2,3\n4,5,6');
    expect(rows).toEqual([['a', 'b', 'c'], ['1', '2', '3'], ['4', '5', '6']]);
  });

  it('should handle quoted fields with commas', () => {
    const rows = parseCsv('name,desc\n"Smith, John","hello"\n');
    expect(rows[1][0]).toBe('Smith, John');
  });

  it('should handle escaped double quotes', () => {
    const rows = parseCsv('a\n"He said ""hi"""\n');
    expect(rows[1][0]).toBe('He said "hi"');
  });

  it('should handle CRLF line endings', () => {
    const rows = parseCsv('a,b\r\n1,2\r\n');
    expect(rows.length).toBe(2);
    expect(rows[1]).toEqual(['1', '2']);
  });

  it('should skip empty rows', () => {
    const rows = parseCsv('a,b\n\n1,2\n\n');
    expect(rows.length).toBe(2);
  });

  it('should return empty array for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('csvToRecords', () => {
  it('should convert rows to records using first row as headers', () => {
    const rows = [['name', 'age'], ['Alice', '30'], ['Bob', '25']];
    const records = csvToRecords(rows);
    expect(records.length).toBe(2);
    expect(records[0]).toEqual({ name: 'Alice', age: '30' });
    expect(records[1]).toEqual({ name: 'Bob', age: '25' });
  });

  it('should return empty array if only header row', () => {
    expect(csvToRecords([['a', 'b']])).toEqual([]);
  });

  it('should return empty array for empty input', () => {
    expect(csvToRecords([])).toEqual([]);
  });

  it('should handle missing values', () => {
    const records = csvToRecords([['a', 'b'], ['1']]);
    expect(records[0]).toEqual({ a: '1', b: '' });
  });

  it('should trim header names', () => {
    const records = csvToRecords([[' name ', ' age '], ['Alice', '30']]);
    expect(records[0]).toEqual({ name: 'Alice', age: '30' });
  });
});
