/**
 * Parse a JSON string into an array of flat records.
 * Accepts: a JSON array of objects, or a JSON object with an array property.
 */
export function parseJsonToRecords(text: string): Record<string, string>[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON: could not parse input.');
  }

  let arr: unknown[];
  if (Array.isArray(data)) {
    arr = data;
  } else if (data && typeof data === 'object') {
    // Find the first array property
    const obj = data as Record<string, unknown>;
    const arrayKey = Object.keys(obj).find(k => Array.isArray(obj[k]));
    if (arrayKey) {
      arr = obj[arrayKey] as unknown[];
    } else {
      // Single object — wrap it
      arr = [data];
    }
  } else {
    throw new Error('JSON must be an array of objects or an object containing an array.');
  }

  return arr.map(item => flattenToStringRecord(item));
}

function flattenToStringRecord(obj: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  if (!obj || typeof obj !== 'object') {
    if (prefix) result[prefix] = String(obj ?? '');
    return result;
  }
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val === null || val === undefined) {
      result[path] = '';
    } else if (Array.isArray(val)) {
      result[path] = val.map(v => String(v)).join(', ');
    } else if (typeof val === 'object') {
      Object.assign(result, flattenToStringRecord(val, path));
    } else {
      result[path] = String(val);
    }
  }
  return result;
}
