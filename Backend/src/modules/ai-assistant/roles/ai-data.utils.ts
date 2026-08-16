import type {
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';

export function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;
}

export function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function readDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value === 'object' && 'toDate' in value) {
    const timestampLike = value as { toDate?: () => unknown };
    if (typeof timestampLike.toDate === 'function') {
      const date = timestampLike.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime())
        ? date
        : null;
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function toIso(value: unknown): string | null {
  return readDate(value)?.toISOString() ?? null;
}

export function mapLoan(
  id: string,
  data: DocumentData,
): Record<string, unknown> {
  const principal = readNumber(
    data.principalMinor,
    readNumber(data.principalAmount, readNumber(data.amount)),
  );
  const remaining = readNumber(
    data.remainingBalanceMinor,
    readNumber(data.remainingAmount, readNumber(data.outstandingBalance)),
  );

  return {
    loanId: readString(data.loanId, id),
    borrowerId: readString(data.borrowerId),
    lenderId: readString(data.lenderId),
    status: readString(data.status, 'unknown').toLowerCase(),
    currency: readString(data.currency, 'LKR'),
    principal,
    annualInterestRate: readNumber(
      data.annualInterestRate,
      readNumber(data.interestRate),
    ),
    tenureMonths: readNumber(data.tenureMonths),
    monthlyInstallment: readNumber(
      data.monthlyInstallmentMinor,
      readNumber(data.monthlyInstallment),
    ),
    amountPaid: readNumber(data.amountPaidMinor, readNumber(data.amountPaid)),
    remainingBalance: remaining,
    nextPaymentDueAt: toIso(data.firstPaymentDueAt ?? data.nextDueDate),
    createdAt: toIso(data.createdAt),
  };
}

export function sortByNewest<T extends { createdAt?: unknown }>(
  items: T[],
): T[] {
  return [...items].sort(
    (left, right) =>
      (readDate(right.createdAt)?.getTime() ?? 0) -
      (readDate(left.createdAt)?.getTime() ?? 0),
  );
}

export function uniqueDocuments(
  documents: QueryDocumentSnapshot<DocumentData>[],
): QueryDocumentSnapshot<DocumentData>[] {
  return Array.from(
    new Map(documents.map((doc) => [doc.ref.path, doc])).values(),
  );
}
