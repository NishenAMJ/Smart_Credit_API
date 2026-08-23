export function normalizeSearchToken(value: unknown): string {
  return typeof value === 'string'
    ? value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
    : '';
}

export function buildSearchTokens(values: unknown[], maximum = 100): string[] {
  const tokens = new Set<string>();
  for (const value of values) {
    const normalized = normalizeSearchToken(value);
    if (!normalized) continue;
    tokens.add(normalized);
    for (const word of normalized.split(/[^a-z0-9@+._-]+/).filter(Boolean)) {
      tokens.add(word);
      for (let length = 2; length <= Math.min(word.length, 20); length += 1)
        tokens.add(word.slice(0, length));
      if (tokens.size >= maximum) return [...tokens].slice(0, maximum);
    }
  }
  return [...tokens].slice(0, maximum);
}
