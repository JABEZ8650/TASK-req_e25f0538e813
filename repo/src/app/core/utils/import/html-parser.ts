/**
 * Parse an HTML snippet into an array of flat records.
 * Handles:
 * - HTML tables → rows become records, first row is headers
 * - Definition lists (<dl>) → dt/dd pairs
 * - Unordered/ordered lists → single-field records
 */
export function parseHtmlToRecords(html: string): Record<string, string>[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Try tables first
  const tables = doc.querySelectorAll('table');
  if (tables.length > 0) {
    return parseTable(tables[0]);
  }

  // Try definition lists
  const dls = doc.querySelectorAll('dl');
  if (dls.length > 0) {
    return parseDl(dls[0]);
  }

  // Try list items
  const lists = doc.querySelectorAll('ul, ol');
  if (lists.length > 0) {
    return parseList(lists[0]);
  }

  // Fallback: try to extract any text content as a single record
  const text = doc.body?.textContent?.trim();
  if (text) {
    return [{ content: text }];
  }

  return [];
}

function parseTable(table: Element): Record<string, string>[] {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length < 2) return [];

  const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
  const headers = headerCells.map(c => (c.textContent ?? '').trim() || `col${headerCells.indexOf(c)}`);

  return rows.slice(1).map(row => {
    const cells = Array.from(row.querySelectorAll('td, th'));
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = (cells[i]?.textContent ?? '').trim();
    });
    return record;
  });
}

function parseDl(dl: Element): Record<string, string>[] {
  const records: Record<string, string>[] = [];
  let current: Record<string, string> = {};
  let lastKey = '';

  for (const child of Array.from(dl.children)) {
    if (child.tagName === 'DT') {
      lastKey = (child.textContent ?? '').trim();
    } else if (child.tagName === 'DD') {
      current[lastKey || 'value'] = (child.textContent ?? '').trim();
    }
  }

  if (Object.keys(current).length > 0) {
    records.push(current);
  }

  return records;
}

function parseList(list: Element): Record<string, string>[] {
  return Array.from(list.querySelectorAll('li')).map(li => ({
    item: (li.textContent ?? '').trim(),
  }));
}
