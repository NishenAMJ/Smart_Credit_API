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
  return readNumber(data.amount, data.principalAmount);
}

export function getLoanCreatedAt(data: DocumentData): Date | null {
  return readDate(data.createdAt, data.startDate, data.signedAt, data.updatedAt);
}

export function getInstallmentAmount(data: DocumentData): number {
  return readNumber(data.amount, data.amountDue, data.originalAmount, data.dueAmount);
}

export function getPaymentAmount(data: DocumentData): number {
  return readNumber(data.amount, data.paidAmount);
}

export function getPaymentCreatedAt(data: DocumentData): Date | null {
  return readDate(data.paidAt, data.paidDate, data.createdAt, data.updatedAt);
}

export function getAdStatus(data: DocumentData): string {
  const status = readString(data.status);

  if (!status) {
    return 'unknown';
  }

  return status === 'approved' ? 'active' : status;
}

export function isActiveAd(data: DocumentData, now = new Date()): boolean {
  const status = getAdStatus(data);
  const expiresAt = readDate(data.expiresAt);

  return ['active', 'approved'].includes(status) && (!expiresAt || expiresAt >= now);
}

export function getNormalizedInstallment(data: DocumentData) {
  const dueDate = readDate(data.dueDateAt, data.dueDate, data.createdAt, data.updatedAt);
  const amount = getInstallmentAmount(data);
  const paidAmount = readNumber(data.paidAmount, data.amountPaid);

  return {
    id: readString(data.installmentId),
    status: normalizeInstallmentStatus(data.status, dueDate, paidAmount, amount),
    dueDate,
    amount,
    paidAmount,
    installmentNumber: readNumber(data.installmentNumber, data.installmentNo),
  };
}

export function getPaymentAncestorData(doc: QueryDocumentSnapshot<DocumentData>) {
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
  const storedRemaining = readNumber(data.remainingAmount);

  if (storedRemaining > 0 || data.remainingAmount === 0) {
    return storedRemaining;
  }

  const totalRepayable = readNumber(data.totalRepayable, data.amount, data.principalAmount);

  if (totalRepayable <= 0) {
    return 0;
  }

  const snapshot = await db.collection('loans').doc(loanId).collection('installments').get();
  const paidTotal = snapshot.docs.reduce(
    (total, installmentDoc) => total + getNormalizedInstallment(installmentDoc.data()).paidAmount,
    0,
  );

  return Math.max(0, totalRepayable - paidTotal);
}

export function readMatchedLenderIds(data: DocumentData): string[] {
  return readStringArray(data.matchedLenderIds);
}
