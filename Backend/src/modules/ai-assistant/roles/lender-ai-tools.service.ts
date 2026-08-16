import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import type { AiToolDefinition } from '../ai-assistant.types';
import {
  mapLoan,
  readDate,
  readNumber,
  readString,
  toIso,
  uniqueDocuments,
} from './ai-data.utils';

@Injectable()
export class LenderAiToolsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  getDefinitions(): AiToolDefinition[] {
    const noArguments = {
      type: 'object' as const,
      properties: {},
      required: [],
      additionalProperties: false as const,
    };

    return [
      this.tool(
        'get_lender_dashboard',
        'Get dashboard totals for the authenticated lender.',
        noArguments,
      ),
      this.tool(
        'list_lender_loans',
        'List loans owned by the authenticated lender.',
        noArguments,
      ),
      this.tool(
        'get_lender_loan_details',
        'Get one authenticated-lender loan and its installment summary.',
        this.idParameters('loanId', 'Loan document ID.'),
      ),
      this.tool(
        'list_lender_borrowers',
        'List borrowers connected to the authenticated lender through loans.',
        noArguments,
      ),
      this.tool(
        'get_lender_borrower_summary',
        'Get a borrower summary only when that borrower has a loan with the authenticated lender.',
        this.idParameters('borrowerId', 'Borrower user ID.'),
      ),
      this.tool(
        'list_lender_payments',
        'List recent repayment transactions received by the authenticated lender.',
        noArguments,
      ),
      this.tool(
        'get_daily_collection',
        'Get repayment collection for one calendar date in Sri Lanka time.',
        {
          type: 'object',
          properties: {
            date: {
              type: ['string', 'null'],
              description: 'Optional YYYY-MM-DD date. Use null for today.',
            },
          },
          required: ['date'],
          additionalProperties: false,
        },
      ),
      this.tool(
        'list_lender_ads',
        'List advertisements owned by the authenticated lender.',
        noArguments,
      ),
      this.tool(
        'list_pending_loan_requests',
        'List pending loan requests visible to the authenticated lender.',
        noArguments,
      ),
    ];
  }

  async execute(
    userId: string,
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    switch (name) {
      case 'get_lender_dashboard':
        return this.getDashboard(userId);
      case 'list_lender_loans':
        return this.listLoans(userId);
      case 'get_lender_loan_details':
        return this.getLoanDetails(userId, this.requiredId(args, 'loanId'));
      case 'list_lender_borrowers':
        return this.listBorrowers(userId);
      case 'get_lender_borrower_summary':
        return this.getBorrowerSummary(
          userId,
          this.requiredId(args, 'borrowerId'),
        );
      case 'list_lender_payments':
        return this.listPayments(userId);
      case 'get_daily_collection':
        return this.getDailyCollection(userId, readString(args.date) || null);
      case 'list_lender_ads':
        return this.listAds(userId);
      case 'list_pending_loan_requests':
        return this.listPendingRequests(userId);
      default:
        throw new NotFoundException(
          `Lender assistant tool ${name} is not available.`,
        );
    }
  }

  private get db() {
    return this.firebaseService.getDb();
  }

  private tool(
    name: string,
    description: string,
    parameters: AiToolDefinition['parameters'],
  ): AiToolDefinition {
    return { type: 'function', name, description, strict: true, parameters };
  }

  private idParameters(
    name: string,
    description: string,
  ): AiToolDefinition['parameters'] {
    return {
      type: 'object',
      properties: { [name]: { type: 'string', description } },
      required: [name],
      additionalProperties: false,
    };
  }

  private requiredId(args: Record<string, unknown>, key: string): string {
    const value = readString(args[key]);
    if (!value) {
      throw new NotFoundException(`${key} is required.`);
    }
    return value;
  }

  private async loanDocuments(lenderId: string) {
    const snapshot = await this.db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .limit(100)
      .get();
    return snapshot.docs;
  }

  private async getDashboard(lenderId: string) {
    const [loanDocs, ads, transactions] = await Promise.all([
      this.loanDocuments(lenderId),
      this.db
        .collection('loanListings')
        .where('lenderId', '==', lenderId)
        .limit(50)
        .get(),
      this.db
        .collection('transactions')
        .where('lenderId', '==', lenderId)
        .limit(100)
        .get(),
    ]);
    const loans = loanDocs.map((doc) => mapLoan(doc.id, doc.data()));
    const borrowerIds = new Set(
      loans.map((loan) => readString(loan.borrowerId)).filter(Boolean),
    );
    const activeLoans = loans.filter((loan) =>
      ['active', 'overdue', 'pending_disbursement'].includes(
        String(loan.status),
      ),
    );
    const today = this.sriLankaDateKey(new Date());
    const todayPayments = transactions.docs.filter(
      (doc) =>
        this.isRepayment(doc.data()) &&
        this.sriLankaDateKey(
          readDate(doc.get('completedAt') ?? doc.get('createdAt')) ??
            new Date(0),
        ) === today,
    );

    return {
      totalBorrowers: borrowerIds.size,
      activeLoanCount: activeLoans.length,
      totalOutstanding: activeLoans.reduce(
        (sum, loan) => sum + readNumber(loan.remainingBalance),
        0,
      ),
      todaysCollection: todayPayments.reduce(
        (sum, doc) =>
          sum +
          readNumber(doc.get('amountMinor'), readNumber(doc.get('amount'))),
        0,
      ),
      todaysPaymentCount: todayPayments.length,
      activeAdCount: ads.docs.filter(
        (doc) => readString(doc.get('status')).toLowerCase() === 'active',
      ).length,
      currency: 'LKR',
    };
  }

  private async listLoans(lenderId: string) {
    const docs = await this.loanDocuments(lenderId);
    return docs
      .map((doc) => ({
        loan: mapLoan(doc.id, doc.data()),
        createdAtMillis: readDate(doc.get('createdAt'))?.getTime() ?? 0,
      }))
      .sort((a, b) => b.createdAtMillis - a.createdAtMillis)
      .slice(0, 10)
      .map((item) => item.loan);
  }

  private async getOwnedLoan(lenderId: string, loanId: string) {
    const snapshot = await this.db.collection('loans').doc(loanId).get();
    if (!snapshot.exists || readString(snapshot.get('lenderId')) !== lenderId) {
      throw new NotFoundException('No matching lender loan was found.');
    }
    return snapshot;
  }

  private async getLoanDetails(lenderId: string, loanId: string) {
    const loan = await this.getOwnedLoan(lenderId, loanId);
    const installmentSnapshot = await loan.ref
      .collection('installments')
      .limit(60)
      .get();
    const installmentStatusCounts = installmentSnapshot.docs.reduce<
      Record<string, number>
    >((counts, doc) => {
      const status = readString(doc.get('status'), 'unknown').toLowerCase();
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    }, {});
    return {
      ...mapLoan(loan.id, loan.data() ?? {}),
      installmentSummary: {
        total: installmentSnapshot.size,
        byStatus: installmentStatusCounts,
      },
    };
  }

  private async listBorrowers(lenderId: string) {
    const loanDocs = await this.loanDocuments(lenderId);
    const byBorrower = new Map<
      string,
      { borrowerId: string; loans: ReturnType<typeof mapLoan>[] }
    >();
    loanDocs.forEach((doc) => {
      const loan = mapLoan(doc.id, doc.data());
      const borrowerId = readString(loan.borrowerId);
      if (!borrowerId) return;
      const entry = byBorrower.get(borrowerId) ?? { borrowerId, loans: [] };
      entry.loans.push(loan);
      byBorrower.set(borrowerId, entry);
    });

    const entries = Array.from(byBorrower.values()).slice(0, 20);
    const userDocs = await Promise.all(
      entries.map((entry) =>
        this.db.collection('users').doc(entry.borrowerId).get(),
      ),
    );
    const userMap = new Map(
      userDocs.filter((doc) => doc.exists).map((doc) => [doc.id, doc]),
    );

    return entries.slice(0, 10).map((entry) => {
      const profile = userMap.get(entry.borrowerId);
      return {
        borrowerId: entry.borrowerId,
        fullName: readString(profile?.get('fullName'), 'Borrower'),
        creditScore:
          readNumber(
            profile?.get('borrowerProfile.creditScore'),
            readNumber(profile?.get('creditScore')),
          ) || null,
        kycStatus: readString(
          profile?.get('kycStatus'),
          'not_submitted',
        ).toLowerCase(),
        loanCount: entry.loans.length,
        activeLoanCount: entry.loans.filter((loan) =>
          ['active', 'overdue'].includes(String(loan.status)),
        ).length,
        totalPrincipal: entry.loans.reduce(
          (sum, loan) => sum + readNumber(loan.principal),
          0,
        ),
        outstandingBalance: entry.loans.reduce(
          (sum, loan) => sum + readNumber(loan.remainingBalance),
          0,
        ),
        currency: 'LKR',
      };
    });
  }

  private async getBorrowerSummary(lenderId: string, borrowerId: string) {
    const lenderLoans = await this.loanDocuments(lenderId);
    const matchingLoans = lenderLoans.filter(
      (doc) => readString(doc.get('borrowerId')) === borrowerId,
    );
    if (matchingLoans.length === 0) {
      throw new NotFoundException(
        'This borrower has no loan relationship with the authenticated lender.',
      );
    }
    const profile = await this.db.collection('users').doc(borrowerId).get();
    const loans = matchingLoans.map((doc) => mapLoan(doc.id, doc.data()));
    return {
      borrowerId,
      fullName: readString(profile.get('fullName'), 'Borrower'),
      creditScore:
        readNumber(
          profile.get('borrowerProfile.creditScore'),
          readNumber(profile.get('creditScore')),
        ) || null,
      kycStatus: readString(
        profile.get('kycStatus'),
        'not_submitted',
      ).toLowerCase(),
      loanCount: loans.length,
      totalPrincipal: loans.reduce(
        (sum, loan) => sum + readNumber(loan.principal),
        0,
      ),
      outstandingBalance: loans.reduce(
        (sum, loan) => sum + readNumber(loan.remainingBalance),
        0,
      ),
      loans,
      currency: 'LKR',
    };
  }

  private async listPayments(lenderId: string) {
    const snapshot = await this.db
      .collection('transactions')
      .where('lenderId', '==', lenderId)
      .limit(100)
      .get();
    return snapshot.docs
      .filter((doc) => this.isRepayment(doc.data()))
      .map((doc) => this.mapPayment(doc))
      .sort(
        (a, b) =>
          (new Date(String(b.createdAt)).getTime() || 0) -
          (new Date(String(a.createdAt)).getTime() || 0),
      )
      .slice(0, 10);
  }

  private mapPayment(doc: QueryDocumentSnapshot<DocumentData>) {
    return {
      transactionId: readString(doc.get('transactionId'), doc.id),
      borrowerId: readString(doc.get('borrowerId')) || null,
      loanId: readString(doc.get('loanId')) || null,
      installmentId: readString(doc.get('installmentId')) || null,
      amount: readNumber(doc.get('amountMinor'), readNumber(doc.get('amount'))),
      currency: readString(doc.get('currency'), 'LKR'),
      status: readString(doc.get('status'), 'unknown').toLowerCase(),
      createdAt: toIso(
        doc.get('completedAt') ?? doc.get('createdAt') ?? doc.get('paidAt'),
      ),
    };
  }

  private isRepayment(data: DocumentData): boolean {
    const type = readString(
      data.type,
      readString(data.transactionType),
    ).toLowerCase();
    const status = readString(data.status, 'completed').toLowerCase();
    return (
      ['repayment', 'payment', 'installment_payment'].includes(type) &&
      !['failed', 'reversed'].includes(status)
    );
  }

  private async getDailyCollection(
    lenderId: string,
    requestedDate: string | null,
  ) {
    const dateKey = requestedDate ?? this.sriLankaDateKey(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new NotFoundException(
        'The collection date must use YYYY-MM-DD format.',
      );
    }
    const snapshot = await this.db
      .collection('transactions')
      .where('lenderId', '==', lenderId)
      .limit(250)
      .get();
    const payments = snapshot.docs
      .filter((doc) => {
        const paidAt = readDate(
          doc.get('completedAt') ?? doc.get('createdAt') ?? doc.get('paidAt'),
        );
        return (
          this.isRepayment(doc.data()) &&
          paidAt &&
          this.sriLankaDateKey(paidAt) === dateKey
        );
      })
      .map((doc) => this.mapPayment(doc));
    return {
      date: dateKey,
      paymentCount: payments.length,
      totalCollected: payments.reduce(
        (sum, payment) => sum + readNumber(payment.amount),
        0,
      ),
      currency: 'LKR',
      payments: payments.slice(0, 25),
    };
  }

  private sriLankaDateKey(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private async listAds(lenderId: string) {
    const snapshot = await this.db
      .collection('loanListings')
      .where('lenderId', '==', lenderId)
      .limit(50)
      .get();
    return snapshot.docs
      .map((doc) => ({
        listingId: readString(doc.get('listingId'), doc.id),
        title: readString(doc.get('title'), 'Loan advertisement'),
        status: readString(doc.get('status'), 'unknown').toLowerCase(),
        minAmount: readNumber(
          doc.get('minAmountMinor'),
          readNumber(doc.get('minAmount')),
        ),
        maxAmount: readNumber(
          doc.get('maxAmountMinor'),
          readNumber(doc.get('maxAmount')),
        ),
        annualInterestRate: readNumber(
          doc.get('minInterestRateAnnual'),
          readNumber(doc.get('preferredInterestRate')),
        ),
        maxTenureMonths: readNumber(doc.get('maxTenureMonths')),
        availableCapital: readNumber(
          doc.get('availableCapitalMinor'),
          readNumber(doc.get('availableCapital')),
        ),
        currency: readString(doc.get('currency'), 'LKR'),
        createdAt: toIso(doc.get('createdAt')),
        expiresAt: toIso(doc.get('expiresAt')),
      }))
      .sort(
        (a, b) =>
          (new Date(String(b.createdAt)).getTime() || 0) -
          (new Date(String(a.createdAt)).getTime() || 0),
      )
      .slice(0, 10);
  }

  private async listPendingRequests(lenderId: string) {
    const snapshot = await this.db
      .collection('loanApplications')
      .where('lenderId', '==', lenderId)
      .limit(50)
      .get();
    const pendingStatuses = new Set([
      'open',
      'submitted',
      'pending',
      'under_review',
      'matched',
      'pending_kyc',
    ]);
    return uniqueDocuments(snapshot.docs)
      .filter((doc) =>
        pendingStatuses.has(readString(doc.get('status')).toLowerCase()),
      )
      .map((doc) => ({
        applicationId: readString(
          doc.get('applicationId'),
          readString(doc.get('requestId'), doc.id),
        ),
        borrowerId: readString(doc.get('borrowerId')),
        listingId: readString(doc.get('listingId')) || null,
        status: readString(doc.get('status'), 'pending').toLowerCase(),
        requestedAmount: readNumber(
          doc.get('requestedPrincipalMinor'),
          readNumber(doc.get('amount')),
        ),
        requestedTenureMonths: readNumber(
          doc.get('requestedTenureMonths'),
          readNumber(doc.get('tenureMonths')),
        ),
        purpose: readString(
          doc.get('requestedPurpose'),
          readString(doc.get('purpose')),
        ),
        createdAt: toIso(doc.get('createdAt')),
      }))
      .sort(
        (a, b) =>
          (new Date(String(b.createdAt)).getTime() || 0) -
          (new Date(String(a.createdAt)).getTime() || 0),
      )
      .slice(0, 10);
  }
}
