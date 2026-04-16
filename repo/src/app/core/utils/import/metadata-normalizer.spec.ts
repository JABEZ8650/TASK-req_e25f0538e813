import {
  matchCanonicalField, autoMapFields,
  normalizeSalary, normalizeExperience,
} from './metadata-normalizer';

describe('matchCanonicalField', () => {
  it('should match exact field names', () => {
    expect(matchCanonicalField('role')).toBe('role');
    expect(matchCanonicalField('salary')).toBe('salary');
    expect(matchCanonicalField('location')).toBe('location');
    expect(matchCanonicalField('skills')).toBe('skills');
  });

  it('should match common synonyms', () => {
    expect(matchCanonicalField('job_title')).toBe('role');
    expect(matchCanonicalField('Job Title')).toBe('role');
    expect(matchCanonicalField('compensation')).toBe('salary');
    expect(matchCanonicalField('years_experience')).toBe('experience');
    expect(matchCanonicalField('degree')).toBe('education');
    expect(matchCanonicalField('technologies')).toBe('skills');
    expect(matchCanonicalField('city')).toBe('location');
  });

  it('should return null for unknown fields', () => {
    expect(matchCanonicalField('foobar')).toBeNull();
    expect(matchCanonicalField('id')).toBeNull();
    expect(matchCanonicalField('created_at')).toBeNull();
  });

  it('should be case-insensitive', () => {
    expect(matchCanonicalField('ROLE')).toBe('role');
    expect(matchCanonicalField('Salary')).toBe('salary');
  });
});

describe('autoMapFields', () => {
  it('should auto-map recognized columns', () => {
    const mapping = autoMapFields(['name', 'salary', 'city', 'skills']);
    expect(mapping.get('salary')).toBe('salary');
    expect(mapping.get('city')).toBe('location');
    expect(mapping.get('skills')).toBe('skills');
  });

  it('should not double-map the same canonical field', () => {
    const mapping = autoMapFields(['title', 'role']);
    // One should be mapped, the other null
    const values = [...mapping.values()].filter(v => v === 'role');
    expect(values.length).toBe(1);
  });

  it('should set null for unmapped columns', () => {
    const mapping = autoMapFields(['id', 'created_at']);
    expect(mapping.get('id')).toBeNull();
    expect(mapping.get('created_at')).toBeNull();
  });
});

describe('normalizeSalary', () => {
  it('should normalize plain USD numbers', () => {
    const result = normalizeSalary('120000');
    expect(result.value).toBe('120000 USD');
    expect(result.normalized).toBe(true);
  });

  it('should normalize $ prefixed values', () => {
    const result = normalizeSalary('$85,000');
    expect(result.value).toBe('85000 USD');
    expect(result.normalized).toBe(true);
  });

  it('should normalize values with USD suffix', () => {
    const result = normalizeSalary('75000 USD');
    expect(result.value).toBe('75000 USD');
    expect(result.normalized).toBe(true);
  });

  it('should flag non-USD values', () => {
    const result = normalizeSalary('€50,000');
    expect(result.normalized).toBe(false);
    expect(result.flagged).toBeTruthy();
    expect(result.value).toBe('€50,000');
  });

  it('should flag unrecognized formats', () => {
    const result = normalizeSalary('competitive');
    expect(result.normalized).toBe(false);
    expect(result.flagged).toBeTruthy();
  });

  it('should handle empty input', () => {
    const result = normalizeSalary('');
    expect(result.value).toBe('');
    expect(result.normalized).toBe(true);
  });
});

describe('normalizeExperience', () => {
  it('should extract numeric years', () => {
    expect(normalizeExperience('5 years').value).toBe('5 years');
    expect(normalizeExperience('3 yrs').value).toBe('3 years');
    expect(normalizeExperience('10').value).toBe('10 years');
  });

  it('should handle decimal years', () => {
    expect(normalizeExperience('2.5 years').value).toBe('2.5 years');
  });

  it('should flag unparseable experience', () => {
    const result = normalizeExperience('senior');
    expect(result.normalized).toBe(false);
    expect(result.flagged).toBeTruthy();
  });

  it('should handle empty input', () => {
    expect(normalizeExperience('').value).toBe('');
  });
});
