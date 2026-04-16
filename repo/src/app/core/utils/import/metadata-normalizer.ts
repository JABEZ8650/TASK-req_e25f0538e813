/**
 * Canonical metadata fields recognized by the import system.
 * Each maps to a normalized key stored on node metadata.
 */
export const CANONICAL_FIELDS = [
  'role',
  'salary',
  'location',
  'experience',
  'education',
  'skills',
] as const;

export type CanonicalField = typeof CANONICAL_FIELDS[number];

/** Common synonyms for canonical field names. */
const FIELD_SYNONYMS: Record<string, CanonicalField> = {
  // role
  'role': 'role',
  'title': 'role',
  'job_title': 'role',
  'jobtitle': 'role',
  'job title': 'role',
  'position': 'role',
  'designation': 'role',
  // salary
  'salary': 'salary',
  'pay': 'salary',
  'compensation': 'salary',
  'wage': 'salary',
  'annual_salary': 'salary',
  'salary_usd': 'salary',
  // location
  'location': 'location',
  'city': 'location',
  'region': 'location',
  'country': 'location',
  'office': 'location',
  'office_location': 'location',
  // experience
  'experience': 'experience',
  'years_experience': 'experience',
  'years_of_experience': 'experience',
  'yoe': 'experience',
  'exp': 'experience',
  'experience_years': 'experience',
  // education
  'education': 'education',
  'degree': 'education',
  'qualification': 'education',
  'academic': 'education',
  'school': 'education',
  'university': 'education',
  // skills
  'skills': 'skills',
  'skill': 'skills',
  'technologies': 'skills',
  'tech_stack': 'skills',
  'tech': 'skills',
  'tools': 'skills',
  'programming_languages': 'skills',
  'languages': 'skills',
  'competencies': 'skills',
};

/**
 * Attempt to match a raw field name to a canonical field.
 * Returns the canonical field or null if no match.
 */
export function matchCanonicalField(rawField: string): CanonicalField | null {
  const normalized = rawField.toLowerCase().trim().replace(/[\s\-]+/g, '_');
  return FIELD_SYNONYMS[normalized] ?? null;
}

/**
 * Auto-generate a mapping from source columns to canonical fields.
 */
export function autoMapFields(sourceColumns: string[]): Map<string, CanonicalField | null> {
  const mapping = new Map<string, CanonicalField | null>();
  const used = new Set<CanonicalField>();

  for (const col of sourceColumns) {
    const match = matchCanonicalField(col);
    if (match && !used.has(match)) {
      mapping.set(col, match);
      used.add(match);
    } else {
      mapping.set(col, null);
    }
  }

  return mapping;
}

export interface NormalizedField {
  key: CanonicalField | string;
  value: string;
  normalized: boolean;
  originalValue?: string;
  flagged?: string; // reason the value is flagged
}

/**
 * Normalize a salary value. Only USD values are normalized.
 * Non-USD values or unrecognized formats are preserved and flagged.
 */
export function normalizeSalary(raw: string): NormalizedField {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { key: 'salary', value: '', normalized: true };
  }

  // Try to extract a numeric value with optional currency prefix
  const usdMatch = trimmed.match(/^\$?\s*([\d,]+(?:\.\d+)?)\s*(?:USD)?$/i);
  if (usdMatch) {
    const num = parseFloat(usdMatch[1].replace(/,/g, ''));
    if (!isNaN(num)) {
      return {
        key: 'salary',
        value: `${num} USD`,
        normalized: true,
        originalValue: trimmed !== `${num} USD` ? trimmed : undefined,
      };
    }
  }

  // Non-USD or unrecognized format — preserve and flag
  return {
    key: 'salary',
    value: trimmed,
    normalized: false,
    originalValue: trimmed,
    flagged: 'Non-USD or unrecognized salary format. Value preserved as-is.',
  };
}

/**
 * Normalize an experience value to a numeric years string.
 */
export function normalizeExperience(raw: string): NormalizedField {
  const trimmed = raw.trim();
  if (!trimmed) return { key: 'experience', value: '', normalized: true };

  const numMatch = trimmed.match(/([\d.]+)\s*(?:years?|yrs?|yr)?/i);
  if (numMatch) {
    const years = parseFloat(numMatch[1]);
    return {
      key: 'experience',
      value: `${years} years`,
      normalized: true,
      originalValue: trimmed !== `${years} years` ? trimmed : undefined,
    };
  }

  return { key: 'experience', value: trimmed, normalized: false, originalValue: trimmed, flagged: 'Could not parse experience years.' };
}
