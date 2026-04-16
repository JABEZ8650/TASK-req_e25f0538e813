import { normalizeSkillTag, parseAndNormalizeSkills } from './skills-normalizer';

describe('normalizeSkillTag', () => {
  it('should normalize known abbreviations', () => {
    expect(normalizeSkillTag('js')).toBe('JavaScript');
    expect(normalizeSkillTag('ts')).toBe('TypeScript');
    expect(normalizeSkillTag('py')).toBe('Python');
    expect(normalizeSkillTag('k8s')).toBe('Kubernetes');
    expect(normalizeSkillTag('reactjs')).toBe('React');
    expect(normalizeSkillTag('golang')).toBe('Go');
  });

  it('should be case-insensitive', () => {
    expect(normalizeSkillTag('JS')).toBe('JavaScript');
    expect(normalizeSkillTag('Python')).toBe('Python');
    expect(normalizeSkillTag('REACT')).toBe('React');
  });

  it('should preserve unknown skills as-is', () => {
    expect(normalizeSkillTag('SomeNewFramework')).toBe('SomeNewFramework');
    expect(normalizeSkillTag('MyCustomTool')).toBe('MyCustomTool');
  });

  it('should handle empty/whitespace', () => {
    expect(normalizeSkillTag('')).toBe('');
    expect(normalizeSkillTag('   ')).toBe('');
  });
});

describe('parseAndNormalizeSkills', () => {
  it('should parse comma-separated skills and normalize', () => {
    const result = parseAndNormalizeSkills('js, python, react');
    expect(result).toEqual(['JavaScript', 'Python', 'React']);
  });

  it('should parse semicolon-separated skills', () => {
    const result = parseAndNormalizeSkills('ts; golang; docker');
    expect(result).toEqual(['TypeScript', 'Go', 'Docker']);
  });

  it('should deduplicate normalized results', () => {
    const result = parseAndNormalizeSkills('js, JavaScript, JS');
    expect(result).toEqual(['JavaScript']);
  });

  it('should return empty for empty input', () => {
    expect(parseAndNormalizeSkills('')).toEqual([]);
    expect(parseAndNormalizeSkills('   ')).toEqual([]);
  });

  it('should handle pipe separators', () => {
    const result = parseAndNormalizeSkills('aws|gcp|azure');
    expect(result).toEqual(['AWS', 'GCP', 'Azure']);
  });
});
