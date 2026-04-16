/**
 * Skill tag normalization. Standardizes common skill name variations
 * into a canonical form (e.g., "JS" → "JavaScript", "Py" → "Python").
 * All local, no external APIs.
 */

const SKILL_SYNONYMS: Record<string, string> = {
  // Languages
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'ts': 'TypeScript',
  'typescript': 'TypeScript',
  'py': 'Python',
  'python': 'Python',
  'rb': 'Ruby',
  'ruby': 'Ruby',
  'java': 'Java',
  'c#': 'C#',
  'csharp': 'C#',
  'c++': 'C++',
  'cpp': 'C++',
  'go': 'Go',
  'golang': 'Go',
  'rust': 'Rust',
  'swift': 'Swift',
  'kotlin': 'Kotlin',
  'php': 'PHP',
  'r': 'R',
  'scala': 'Scala',
  'sql': 'SQL',
  'html': 'HTML',
  'css': 'CSS',
  'sass': 'Sass',
  'scss': 'Sass',
  'less': 'Less',

  // Frameworks
  'react': 'React',
  'reactjs': 'React',
  'react.js': 'React',
  'angular': 'Angular',
  'angularjs': 'Angular',
  'vue': 'Vue',
  'vuejs': 'Vue',
  'vue.js': 'Vue',
  'svelte': 'Svelte',
  'next': 'Next.js',
  'nextjs': 'Next.js',
  'next.js': 'Next.js',
  'nuxt': 'Nuxt',
  'express': 'Express',
  'expressjs': 'Express',
  'django': 'Django',
  'flask': 'Flask',
  'spring': 'Spring',
  'rails': 'Ruby on Rails',
  'ruby on rails': 'Ruby on Rails',
  'ror': 'Ruby on Rails',
  'dotnet': '.NET',
  '.net': '.NET',
  'asp.net': 'ASP.NET',
  'laravel': 'Laravel',
  'fastapi': 'FastAPI',

  // Databases
  'postgres': 'PostgreSQL',
  'postgresql': 'PostgreSQL',
  'mysql': 'MySQL',
  'mongo': 'MongoDB',
  'mongodb': 'MongoDB',
  'redis': 'Redis',
  'sqlite': 'SQLite',
  'dynamodb': 'DynamoDB',
  'cassandra': 'Cassandra',
  'elasticsearch': 'Elasticsearch',

  // Cloud & tools
  'aws': 'AWS',
  'amazon web services': 'AWS',
  'gcp': 'GCP',
  'google cloud': 'GCP',
  'azure': 'Azure',
  'docker': 'Docker',
  'k8s': 'Kubernetes',
  'kubernetes': 'Kubernetes',
  'terraform': 'Terraform',
  'jenkins': 'Jenkins',
  'git': 'Git',
  'github': 'GitHub',
  'gitlab': 'GitLab',
  'ci/cd': 'CI/CD',
  'cicd': 'CI/CD',
  'graphql': 'GraphQL',
  'rest': 'REST',
  'restapi': 'REST',
  'grpc': 'gRPC',

  // Data science
  'ml': 'Machine Learning',
  'machine learning': 'Machine Learning',
  'ai': 'AI',
  'artificial intelligence': 'AI',
  'deep learning': 'Deep Learning',
  'dl': 'Deep Learning',
  'tensorflow': 'TensorFlow',
  'tf': 'TensorFlow',
  'pytorch': 'PyTorch',
  'pandas': 'Pandas',
  'numpy': 'NumPy',
  'scikit-learn': 'scikit-learn',
  'sklearn': 'scikit-learn',

  // General
  'agile': 'Agile',
  'scrum': 'Scrum',
  'jira': 'Jira',
  'linux': 'Linux',
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'deno': 'Deno',
};

/**
 * Normalize a single skill tag to its canonical form.
 */
export function normalizeSkillTag(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const key = trimmed.toLowerCase();
  return SKILL_SYNONYMS[key] ?? trimmed; // preserve unknown skills as-is
}

/**
 * Parse a skills string (comma/semicolon separated) into normalized tags.
 */
export function parseAndNormalizeSkills(raw: string): string[] {
  if (!raw.trim()) return [];
  const tags = raw.split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
  const normalized = tags.map(normalizeSkillTag);
  // Deduplicate
  return [...new Set(normalized)];
}
