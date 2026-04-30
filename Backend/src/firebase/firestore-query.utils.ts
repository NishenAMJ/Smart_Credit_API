// Dummy implementations for firestore-query.utils
export const applyDateCursor = (query: any, cursor?: string | null) => {
  if (!cursor) return query;
  return query.startAfter(cursor);
};

export const buildPageInfo = (...args: any[]): any => {
  if (args.length === 3) {
    const [items, pageSize, hasMore] = args;
    return { pageSize, hasMore, nextCursor: '' };
  }

  const [items, pageSize, hasMore, endCursor] = args;
  return { hasNextPage: hasMore, endCursor: endCursor || '' };
};

export const orderByDateAndId = (
  query: any,
  field: string,
  direction: 'asc' | 'desc' = 'desc',
) => query.orderBy(field, direction);

export const readDate = (
  value: any,
  defaultValue: Date | null = null,
): Date | null => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? defaultValue : parsed;
  }
  return defaultValue;
};

export const readNumber = (
  value: any,
  defaultValue?: number,
  fallback?: number,
): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof defaultValue === 'number' && Number.isFinite(defaultValue)) return defaultValue;
  return typeof fallback === 'number' && Number.isFinite(fallback) ? fallback : 0;
};

export const readStringArray = (
  value: any,
  defaultValue: string[] = [],
): string[] => {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
  return defaultValue;
};

export const readString = (value: any, ...defaults: any[]): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  for (const fallback of defaults) {
    if (typeof fallback === 'string' && fallback.trim().length > 0) {
      return fallback;
    }
  }
  return null;
};

export const hasRole = (roles: string[], role: string): boolean => roles.includes(role);

export const encodeCursor = (date: Date | null, id: string): string | null => {
  if (!date) return null;
  return `${date.toISOString()}:${id}`;
};

export const decodeCursor = (
  cursor: string | null | undefined,
): { date: Date; id: string } | null => {
  if (!cursor) return null;
  const [dateStr, id] = cursor.split(':');
  return { date: new Date(dateStr), id };
};

export const chunkValues = (values: any[], size: number): any[][] => {
  const chunks: any[][] = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
};

export const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export const scanQueryPage = async (options: {
  pageSize: number;
  cursor?: string | null;
  batchSize: number;
  fetchChunk: (nextCursor: string | null, batchSize: number) => Promise<any[]>;
  mapDoc: (doc: any) => Promise<any>;
}): Promise<{ items: any[] }> => {
  const { pageSize, cursor, batchSize, fetchChunk, mapDoc } = options;
  const docs = await fetchChunk(cursor ?? null, batchSize);
  const items: any[] = [];

  for (const doc of docs) {
    const mapped = await mapDoc(doc);
    if (mapped !== null) {
      items.push(mapped);
    }
    if (items.length >= pageSize + 1) {
      break;
    }
  }

  return { items };
};