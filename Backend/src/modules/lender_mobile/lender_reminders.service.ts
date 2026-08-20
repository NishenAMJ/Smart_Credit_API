import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import {
  readDate,
  readNumber,
  readString,
} from '../../firebase/firestore-query.utils';

export interface PaymentReminder {
  id: string;
  loanId: string;
  borrowerId: string;
  borrowerName: string;
  amountDue: number;
  dueDate: string;
  status: 'scheduled' | 'due' | 'overdue';
}

@Injectable()
export class LenderRemindersService {
  private readonly logger = new Logger(LenderRemindersService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Fetch upcoming payment reminders for all active loans owned by this lender.
   * Reads from 'loans' collection where lenderId matches and status is 'active'.
   * Returns installments that are due within the next 30 days or overdue.
   */
  async getReminders(lenderId: string): Promise<PaymentReminder[]> {
    this.logger.log(`Fetching payment reminders for lender ${lenderId}`);

    const db = this.firebaseService.db;
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    // Try 'loans' collection first (primary)
    const snapshot = await db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .where('status', 'in', ['active', 'overdue'])
      .limit(50)
      .get();

    const borrowerIds = Array.from(
      new Set(
        snapshot.docs
          .map((doc) => readString(doc.get('borrowerId')))
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const borrowerSnapshots = borrowerIds.length
      ? await db.getAll(
          ...borrowerIds.map((id) => db.collection('users').doc(id)),
        )
      : [];
    const borrowerNames = new Map(
      borrowerSnapshots.map((doc) => [
        doc.id,
        readString(doc.get('fullName')) ?? 'Unknown borrower',
      ]),
    );
    const reminders: PaymentReminder[] = [];

    for (const doc of snapshot.docs) {
      const borrowerId = readString(doc.get('borrowerId')) ?? '';
      const installments = await doc.ref.collection('installments').get();

      for (const installment of installments.docs) {
        const installmentStatus =
          readString(installment.get('status'))?.toLowerCase() ?? 'scheduled';
        const dueDate = readDate(installment.get('dueAt'));
        if (
          !dueDate ||
          dueDate > thirtyDaysFromNow ||
          ['paid', 'waived'].includes(installmentStatus)
        ) {
          continue;
        }

        reminders.push({
          id: `${doc.id}_${installment.id}`,
          loanId: doc.id,
          borrowerId,
          borrowerName: borrowerNames.get(borrowerId) ?? 'Unknown borrower',
          amountDue: readNumber(installment.get('amountDueMinor')) / 100,
          dueDate: dueDate.toISOString(),
          status:
            installmentStatus === 'overdue' || dueDate < now
              ? 'overdue'
              : installmentStatus === 'due'
                ? 'due'
                : 'scheduled',
        });
      }
    }

    // Sort by due date ascending
    reminders.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );

    this.logger.debug(
      `Found ${reminders.length} reminders for lender ${lenderId}`,
    );
    return reminders;
  }
}
