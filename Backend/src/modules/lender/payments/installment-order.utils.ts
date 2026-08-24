import type { DocumentData } from 'firebase-admin/firestore';
import { getNormalizedInstallment } from '../../../firebase/firestore-seed.utils';

type InstallmentDocument = {
  id: string;
  data(): DocumentData;
};

export function findNextUnsettledInstallmentId(
  documents: InstallmentDocument[],
): string | null {
  return (
    documents
      .map((document) => ({
        id: document.id,
        normalized: getNormalizedInstallment(document.data()),
      }))
      .filter(
        ({ normalized }) =>
          normalized.status !== 'paid' && normalized.status !== 'waived',
      )
      .sort((left, right) => {
        const leftSequence = left.normalized.installmentNumber || Infinity;
        const rightSequence = right.normalized.installmentNumber || Infinity;
        if (leftSequence !== rightSequence) return leftSequence - rightSequence;
        const leftDueAt = left.normalized.dueDate?.getTime() ?? Infinity;
        const rightDueAt = right.normalized.dueDate?.getTime() ?? Infinity;
        return leftDueAt - rightDueAt || left.id.localeCompare(right.id);
      })[0]?.id ?? null
  );
}
