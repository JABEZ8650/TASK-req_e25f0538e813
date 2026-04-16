import { CanonicalField, NormalizedField, normalizeSalary, normalizeExperience } from './metadata-normalizer';
import { parseAndNormalizeSkills } from './skills-normalizer';

export interface FieldMapping {
  sourceColumn: string;
  targetField: CanonicalField | null; // null = unmapped / skip
}

export interface ValidatedRow {
  rowIndex: number;
  sourceData: Record<string, string>;
  fields: NormalizedField[];
  errors: string[];
  accepted: boolean; // true if no blocking errors
}

/**
 * Validate and normalize a single row against the field mapping.
 */
export function validateRow(
  rowIndex: number,
  sourceData: Record<string, string>,
  mappings: FieldMapping[],
): ValidatedRow {
  const fields: NormalizedField[] = [];
  const errors: string[] = [];

  for (const mapping of mappings) {
    if (!mapping.targetField) continue; // unmapped column, skip
    const rawValue = sourceData[mapping.sourceColumn] ?? '';

    let field: NormalizedField;

    switch (mapping.targetField) {
      case 'salary':
        field = normalizeSalary(rawValue);
        break;
      case 'experience':
        field = normalizeExperience(rawValue);
        break;
      case 'skills':
        const tags = parseAndNormalizeSkills(rawValue);
        field = {
          key: 'skills',
          value: tags.join(', '),
          normalized: true,
          originalValue: rawValue !== tags.join(', ') ? rawValue : undefined,
        };
        break;
      case 'role':
      case 'location':
      case 'education':
        // Simple string fields — pass through trimmed
        field = {
          key: mapping.targetField,
          value: rawValue.trim(),
          normalized: true,
        };
        if (!rawValue.trim()) {
          field.flagged = `${mapping.targetField} is empty.`;
        }
        break;
      default:
        field = { key: mapping.targetField, value: rawValue.trim(), normalized: true };
    }

    if (field.flagged) {
      errors.push(field.flagged);
    }

    fields.push(field);
  }

  // Also preserve any unmapped fields as pass-through
  for (const mapping of mappings) {
    if (mapping.targetField !== null) continue;
    const rawValue = sourceData[mapping.sourceColumn] ?? '';
    if (rawValue.trim()) {
      fields.push({
        key: mapping.sourceColumn,
        value: rawValue.trim(),
        normalized: false,
        flagged: 'Unmapped field — preserved as-is.',
      });
    }
  }

  return {
    rowIndex,
    sourceData,
    fields,
    errors,
    accepted: true, // initially accepted; UI allows toggling
  };
}

/**
 * Validate all rows.
 */
export function validateAllRows(
  records: Record<string, string>[],
  mappings: FieldMapping[],
): ValidatedRow[] {
  return records.map((rec, i) => validateRow(i, rec, mappings));
}
