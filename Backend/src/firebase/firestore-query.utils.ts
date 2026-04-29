import {
  DocumentData,
  FieldPath,
  Query,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase-admin/firestore';

export interface DecodedCursor {
  date: Date;
  id: string;
}

export interface PageInfo {
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
}

type CursorShape = {
  timestamp: string;
  id: string;
};

export function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

export function hasRole(value: unknown, role: string): boolean {
  if (typeof value === 'string') {
    return value === role;
  }

  return Array.isArray(value)
    ? value.some((entry) => typeof entry === 'string' && entry === role)
    : false;
}

export function readString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

export function readNumber(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

export function readDate(...values: unknown[]): Date | null {
  for (const value of values) {
    if (value instanceof Timestamp) {
      return value.toDate();
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  return null;
}

export function normalizeInstallmentStatus(
  rawStatus: unknown,
  dueDate: Date | null,
  paidAmount: number,
  installmentAmount: number,
): string {
  const normalized =
    typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : 'unknown';

  if (installmentAmount > 0 && paidAmount >= installmentAmount) {
    return 'paid';
  }

  if (normalized === 'partial') {
    return 'partially_paid';
  }

  if (normalized === 'pending' && dueDate && dueDate.getTime() < Date.now()) {
    return 'overdue';
  }

  return normalized || 'unknown';
}

export function getPaymentAncestorIds(path: string): {
  loanId: string | null;
  installmentId: string | null;
} {
  const segments = path.split('/').filter((segment) => segment.length > 0);
  const loanIndex = segments.findIndex((segment) => segment === 'loans');
  const installmentIndex = segments.findIndex(
    (segment) => segment === 'installments',
  );

  return {
    loanId:
      loanIndex >= 0 && loanIndex + 1 < segments.length
        ? segments[loanIndex + 1]
        : null,
    installmentId:
      installmentIndex >= 0 && installmentIndex + 1 < segments.length
        ? segments[installmentIndex + 1]
        : null,
  };
}

export function encodeCursor(date: Date | null, id: string): string | null {
  if (!date || !id.trim()) {
    return null;
  }

  const payload: CursorShape = {
    timestamp: date.toISOString(),
    id,
  };

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(
  cursor: string | null | undefined,
): DecodedCursor | null {
  if (!cursor || cursor.trim().length === 0) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as Partial<CursorShape>;
    const parsedDate =
      typeof payload.timestamp === 'string'
        ? new Date(payload.timestamp)
        : null;

    if (!parsedDate || Number.isNaN(parsedDate.getTime()) || !payload.id) {
      return null;
    }

    return {
      date: parsedDate,
      id: payload.id,
    };
  } catch {
    return null;
  }
}

export function applyDateCursor<T extends Query<DocumentData>>(
  query: T,
  cursor: string | null | undefined,
): T {
  const decoded = decodeCursor(cursor);

  if (!decoded) {
    return query;
  }

  return query.startAfter(Timestamp.fromDate(decoded.date), decoded.id) as T;
}

export function orderByDateAndId<T extends Query<DocumentData>>(
  query: T,
  field: string,
): T {
  return query
    .orderBy(field, 'desc')
    .orderBy(FieldPath.documentId(), 'desc') as T;
}

export function buildPageInfo<
  T extends { cursorDate: Date | null; cursorId: string },
>(items: T[], pageSize: number, hasMore: boolean): PageInfo {
  const lastItem = items[items.length - 1];

  return {
    pageSize,
    hasMore,
    nextCursor:
      hasMore && lastItem
        ? encodeCursor(lastItem.cursorDate, lastItem.cursorId)
        : null,
  };
}

export async function scanQueryPage<T>(options: {
  pageSize: number;
  cursor?: string | null;
  batchSize?: number;
  fetchChunk: (
    cursor: string | null,
    batchSize: number,
  ) => Promise<QueryDocumentSnapshot<DocumentData>[]>;
  mapDoc: (
    doc: QueryDocumentSnapshot<DocumentData>,
  ) => Promise<T | null> | T | null;
}): Promise<{ items: T[]; exhausted: boolean }> {
  const batchSize = Math.max(
    options.batchSize ?? options.pageSize * 2,
    options.pageSize,
  );
  let currentCursor = options.cursor ?? null;
  let exhausted = false;
  const items: T[] = [];

  while (items.length < options.pageSize + 1 && !exhausted) {
    const docs = await options.fetchChunk(currentCursor, batchSize);

    if (docs.length === 0) {
      exhausted = true;
      break;
    }

    for (const doc of docs) {
      const mapped = await options.mapDoc(doc);

      if (mapped) {
        items.push(mapped);

        if (items.length >= options.pageSize + 1) {
          break;
        }
      }
    }

    currentCursor = encodeCursor(
      readDate(docs[docs.length - 1].get('createdAt')) ??
        readDate(docs[docs.length - 1].get('paidAt')) ??
        new Date(0),
      docs[docs.length - 1].id,
    );
    exhausted = docs.length < batchSize;
  }

  return {
    items,
    exhausted,
  };
}
