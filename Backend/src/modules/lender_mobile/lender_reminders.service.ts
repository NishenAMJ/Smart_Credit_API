import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

export interface PaymentReminder {
  id: string;
  loanId: string;
  borrowerId: string;
  borrowerName: string;
  amountDue: number;
  dueDate: string;
  status: 'pending' | 'sent' | 'paid';
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

    const reminders: PaymentReminder[] = [];

    for (const doc of snapshot.docs) {
      const loan = doc.data();

      // Check nextInstallmentDue date
      let dueDate: Date | null = null;
      if (loan.nextInstallmentDue) {
        if (loan.nextInstallmentDue?.toDate) {
          dueDate = loan.nextInstallmentDue.toDate();
        } else if (typeof loan.nextInstallmentDue === 'string') {
          dueDate = new Date(loan.nextInstallmentDue);
        }
      }

      if (!dueDate) continue;

      // Only include if due within 30 days or already overdue
      if (dueDate <= thirtyDaysFromNow) {
        const isPaid = loan.status === 'paid';
        const isPastDue = dueDate < now;

        reminders.push({
          id: doc.id,
          loanId: doc.id,
          borrowerId: loan.borrowerId ?? '',
          borrowerName: loan.borrowerName ?? 'Unknown',
          amountDue: Number(
            loan.nextInstallmentAmount ?? loan.monthlyInstallment ?? 0,
          ),
          dueDate: dueDate.toISOString(),
          status: isPaid ? 'paid' : isPastDue ? 'pending' : 'pending',
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
