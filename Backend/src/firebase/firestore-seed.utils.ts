import {
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import {
  getPaymentAncestorIds,
  normalizeInstallmentStatus,
  readDate,
  readNumber,
  readString,
  readStringArray,
} from './firestore-query.utils';

export function getLoanAmount(data: DocumentData): number {
  if (typeof data.principalMinor === 'number') {
    return data.principalMinor / 100;
  }
  return readNumber(data.amount, data.principalAmount);
}

export function getLoanCreatedAt(data: DocumentData): Date | null {
  return readDate(
    data.createdAt,
    data.startDate,
    data.signedAt,
    data.updatedAt,
  );
}

export function getInstallmentAmount(data: DocumentData): number {
  if (typeof data.amountDueMinor === 'number') {
    return data.amountDueMinor / 100;
  }
  return readNumber(
    data.amount,
    data.amountDue,
    data.originalAmount,
    data.dueAmount,
  );
}

export function getPaymentAmount(data: DocumentData): number {
  if (typeof data.amountMinor === 'number') {
    return data.amountMinor / 100;
  }
  return readNumber(data.amount, data.paidAmount);
}

export function getPaymentCreatedAt(data: DocumentData): Date | null {
  return readDate(
    data.completedAt,
    data.paidAt,
    data.paidDate,
    data.createdAt,
    data.updatedAt,
  );
}

export function getAdStatus(data: DocumentData): string {
  const status = readString(data.status);

  if (!status) {
    return 'unknown';
  }

  if (status === 'approved') return 'active';
  if (status === 'pending') return 'pending_review';
  return status;
}

export function isActiveAd(data: DocumentData, now = new Date()): boolean {
  const status = getAdStatus(data);
  const expiresAt = readDate(data.expiresAt);

  return (
    ['active', 'approved'].includes(status) && (!expiresAt || expiresAt >= now)
  );
}

export function getNormalizedInstallment(data: DocumentData) {
  const dueDate = readDate(
    data.dueAt,
    data.dueDateAt,
    data.dueDate,
    data.createdAt,
    data.updatedAt,
  );
  const amount = getInstallmentAmount(data);
  const paidAmount =
    data.status === 'paid'
      ? amount
      : readNumber(data.paidAmount, data.amountPaid);

  return {
    id: readString(data.installmentId),
    status: normalizeInstallmentStatus(
      data.status,
      dueDate,
      paidAmount,
      amount,
    ),
    dueDate,
    amount,
    paidAmount,
    installmentNumber: readNumber(
      data.sequence,
      data.installmentNumber,
      data.installmentNo,
    ),
  };
}

export function getPaymentAncestorData(
  doc: QueryDocumentSnapshot<DocumentData>,
) {
  const data = doc.data();
  const ancestors = getPaymentAncestorIds(doc.ref.path);

  return {
    loanId: readString(data.loanId) ?? ancestors.loanId,
    installmentId: readString(data.installmentId) ?? ancestors.installmentId,
    lenderId: readString(data.lenderId),
    borrowerId: readString(data.borrowerId),
  };
}

export async function computeLoanRemainingAmount(
  db: Firestore,
  loanId: string,
  data: DocumentData,
): Promise<number> {
  void db;
  void loanId;
  const storedRemaining =
    typeof data.remainingBalanceMinor === 'number'
      ? data.remainingBalanceMinor / 100
      : readNumber(data.remainingAmount);

  if (
    storedRemaining > 0 ||
    data.remainingAmount === 0 ||
    data.remainingBalanceMinor === 0
  ) {
    return storedRemaining;
  }

  const totalRepayable =
    typeof data.totalRepayableMinor === 'number'
      ? data.totalRepayableMinor / 100
      : readNumber(data.totalRepayable, data.amount, data.principalAmount);

  return totalRepayable > 0 ? totalRepayable : 0;
}

export function readMatchedLenderIds(data: DocumentData): string[] {
  return readStringArray(data.matchedLenderIds);
}

function normalizeSearchValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, ' ');
}

export function buildSearchKeywords(
  ...values: Array<string | null | undefined>
): string[] {
  const keywords = new Set<string>();

  values.forEach((value) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return;
    }

    const normalized = normalizeSearchValue(value);

    if (!normalized) {
      return;
    }

    normalized
      .split(/\s+/)
      .filter((token) => token.length >= 2)
      .forEach((token) => {
        for (let index = 2; index <= token.length; index += 1) {
          keywords.add(token.slice(0, index));
        }
      });
  });

  return Array.from(keywords);
}
