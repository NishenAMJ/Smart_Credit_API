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
} from './ai-data.utils';

@Injectable()
export class BorrowerAiToolsService {
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
        'get_borrower_dashboard',
        'Get the authenticated borrower dashboard totals and next payment.',
        noArguments,
      ),
      this.tool(
        'list_my_loans',
        'List the authenticated borrower loans.',
        noArguments,
      ),
      this.tool(
        'get_my_loan_details',
        'Get one borrower-owned loan and its monthly installment summary.',
        this.idParameters('loanId', 'Loan document ID.'),
      ),
      this.tool(
        'list_my_installments',
        'List monthly installments for one borrower-owned loan.',
        this.idParameters('loanId', 'Loan document ID.'),
      ),
      this.tool(
        'list_my_payments',
        'List recent repayment transactions for the authenticated borrower.',
        noArguments,
      ),
      this.tool(
        'list_my_applications',
        'List recent loan applications for the authenticated borrower.',
        noArguments,
      ),
      this.tool(
        'get_my_application_status',
        'Get one borrower-owned application status.',
        this.idParameters(
          'applicationId',
          'Application or loan request document ID.',
        ),
      ),
      this.tool(
        'search_active_loan_listings',
        'List active lender loan advertisements available to borrowers.',
        noArguments,
      ),
      this.tool(
        'get_my_kyc_status',
        'Get the authenticated borrower KYC status without private document data.',
        noArguments,
      ),
      this.tool(
        'get_my_dispute_status',
        'List recent disputes opened by or involving the authenticated borrower.',
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
      case 'get_borrower_dashboard':
        return this.getDashboard(userId);
      case 'list_my_loans':
        return this.listLoans(userId);
      case 'get_my_loan_details':
        return this.getLoanDetails(userId, this.requiredId(args, 'loanId'));
      case 'list_my_installments':
        return this.listInstallments(userId, this.requiredId(args, 'loanId'));
      case 'list_my_payments':
        return this.listPayments(userId);
      case 'list_my_applications':
        return this.listApplications(userId);
      case 'get_my_application_status':
        return this.getApplication(
          userId,
          this.requiredId(args, 'applicationId'),
        );
      case 'search_active_loan_listings':
        return this.listActiveAds();
      case 'get_my_kyc_status':
        return this.getKycStatus(userId);
      case 'get_my_dispute_status':
        return this.listDisputes(userId);
      default:
        throw new NotFoundException(
          `Borrower assistant tool ${name} is not available.`,
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

  private async loanDocuments(userId: string) {
    const snapshot = await this.db
      .collection('loans')
      .where('borrowerId', '==', userId)
      .limit(50)
      .get();
    return snapshot.docs;
  }

  private async getDashboard(userId: string) {
    const [loanDocs, applicationSnapshot] = await Promise.all([
      this.loanDocuments(userId),
      this.db
        .collection('loanApplications')
        .where('borrowerId', '==', userId)
        .limit(50)
        .get(),
    ]);
    const loans = loanDocs.map((doc) => mapLoan(doc.id, doc.data()));
    const activeLoans = loans.filter((loan) =>
      ['active', 'overdue'].includes(String(loan.status)),
    );
    const pendingApplications = applicationSnapshot.docs.filter((doc) =>
      ['draft', 'submitted', 'pending', 'under_review', 'matched'].includes(
        readString(doc.get('status')).toLowerCase(),
      ),
    ).length;
    const outstanding = activeLoans.reduce(
      (sum, loan) => sum + readNumber(loan.remainingBalance),
      0,
    );
    const nextLoan = [...activeLoans]
      .filter((loan) => loan.nextPaymentDueAt)
      .sort((a, b) =>
        String(a.nextPaymentDueAt).localeCompare(String(b.nextPaymentDueAt)),
      )[0];

    return {
      activeLoanCount: activeLoans.length,
      pendingApplicationCount: pendingApplications,
      outstandingBalance: outstanding,
      currency: 'LKR',
      nextPayment: nextLoan
        ? {
            loanId: nextLoan.loanId,
            amount: nextLoan.monthlyInstallment,
            dueAt: nextLoan.nextPaymentDueAt,
          }
        : null,
    };
  }

  private async listLoans(userId: string) {
    const docs = await this.loanDocuments(userId);
    const loans = docs.map((doc) => ({
      loan: mapLoan(doc.id, doc.data()),
      createdAtValue: doc.get('createdAt') as unknown,
    }));
    return loans
      .sort(
        (a, b) =>
          (readDate(b.createdAtValue)?.getTime() ?? 0) -
          (readDate(a.createdAtValue)?.getTime() ?? 0),
      )
      .slice(0, 10)
      .map((item) => item.loan);
  }

  private async getOwnedLoan(userId: string, loanId: string) {
    const snapshot = await this.db.collection('loans').doc(loanId).get();
    if (!snapshot.exists || readString(snapshot.get('borrowerId')) !== userId) {
      throw new NotFoundException('No matching borrower loan was found.');
    }
    return snapshot;
  }

  private async getLoanDetails(userId: string, loanId: string) {
    const loan = await this.getOwnedLoan(userId, loanId);
    const installments = await loan.ref
      .collection('installments')
      .limit(60)
      .get();
    const statusCounts = installments.docs.reduce<Record<string, number>>(
      (counts, doc) => {
        const status = readString(doc.get('status'), 'unknown').toLowerCase();
        counts[status] = (counts[status] ?? 0) + 1;
        return counts;
      },
      {},
    );
    return {
      ...mapLoan(loan.id, loan.data() ?? {}),
      installmentSummary: {
        total: installments.size,
        byStatus: statusCounts,
      },
    };
  }

  private async listInstallments(userId: string, loanId: string) {
    const loan = await this.getOwnedLoan(userId, loanId);
    const snapshot = await loan.ref.collection('installments').limit(60).get();
    return snapshot.docs
      .map((doc) => ({
        installmentId: readString(doc.get('installmentId'), doc.id),
        sequence: readNumber(doc.get('sequence')),
        status: readString(doc.get('status'), 'unknown').toLowerCase(),
        amountDue: readNumber(
          doc.get('amountDueMinor'),
          readNumber(doc.get('amountDue')),
        ),
        currency: readString(doc.get('currency'), 'LKR'),
        dueAt: toIso(doc.get('dueAt') ?? doc.get('dueDate')),
        paidAt: toIso(doc.get('paidAt')),
      }))
      .sort((a, b) => a.sequence - b.sequence)
      .slice(0, 36);
  }

  private async listPayments(userId: string) {
    const snapshot = await this.db
      .collection('transactions')
      .where('borrowerId', '==', userId)
      .limit(50)
      .get();
    return this.mapTransactions(snapshot.docs).slice(0, 10);
  }

  private mapTransactions(docs: QueryDocumentSnapshot<DocumentData>[]) {
    return docs
      .map((doc) => ({
        transactionId: readString(doc.get('transactionId'), doc.id),
        type: readString(doc.get('type'), 'unknown').toLowerCase(),
        status: readString(doc.get('status'), 'unknown').toLowerCase(),
        amount: readNumber(
          doc.get('amountMinor'),
          readNumber(doc.get('amount')),
        ),
        currency: readString(doc.get('currency'), 'LKR'),
        loanId: readString(doc.get('loanId')) || null,
        installmentId: readString(doc.get('installmentId')) || null,
        createdAt: toIso(doc.get('createdAt') ?? doc.get('paidAt')),
        createdAtValue: (doc.get('createdAt') ?? doc.get('paidAt')) as unknown,
      }))
      .sort(
        (a, b) =>
          (new Date(String(b.createdAt)).getTime() || 0) -
          (new Date(String(a.createdAt)).getTime() || 0),
      )
      .map((item) => ({
        transactionId: item.transactionId,
        type: item.type,
        status: item.status,
        amount: item.amount,
        currency: item.currency,
        loanId: item.loanId,
        installmentId: item.installmentId,
        createdAt: item.createdAt,
      }));
  }

  private async listApplications(userId: string) {
    const snapshot = await this.db
      .collection('loanApplications')
      .where('borrowerId', '==', userId)
      .limit(50)
      .get();
    return snapshot.docs
      .map((doc) => this.mapApplication(doc))
      .sort(
        (a, b) =>
          (new Date(String(b.createdAt)).getTime() || 0) -
          (new Date(String(a.createdAt)).getTime() || 0),
      )
      .slice(0, 10);
  }

  private mapApplication(doc: QueryDocumentSnapshot<DocumentData>) {
    return {
      applicationId: readString(
        doc.get('applicationId'),
        readString(doc.get('requestId'), doc.id),
      ),
      listingId:
        readString(doc.get('listingId'), readString(doc.get('adId'))) || null,
      lenderId:
        readString(
          doc.get('lenderId'),
          readString(doc.get('targetLenderId')),
        ) || null,
      status: readString(doc.get('status'), 'unknown').toLowerCase(),
      requestedPrincipal: readNumber(
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
      convertedLoanId: readString(doc.get('convertedLoanId')) || null,
      createdAt: toIso(doc.get('createdAt')),
      updatedAt: toIso(doc.get('updatedAt')),
    };
  }

  private async getApplication(userId: string, applicationId: string) {
    let snapshot = await this.db
      .collection('loanApplications')
      .doc(applicationId)
      .get();
    if (!snapshot.exists) {
      const query = await this.db
        .collection('loanApplications')
        .where('applicationId', '==', applicationId)
        .limit(1)
        .get();
      snapshot = query.docs[0] ?? snapshot;
    }
    if (!snapshot.exists || readString(snapshot.get('borrowerId')) !== userId) {
      throw new NotFoundException(
        'No matching borrower application was found.',
      );
    }
    return this.mapApplication(snapshot as QueryDocumentSnapshot<DocumentData>);
  }

  private async listActiveAds() {
    const snapshot = await this.db
      .collection('loanListings')
      .where('status', '==', 'active')
      .limit(20)
      .get();
    return snapshot.docs.slice(0, 10).map((doc) => ({
      listingId: readString(
        doc.get('listingId'),
        readString(doc.get('adId'), doc.id),
      ),
      lenderId: readString(doc.get('lenderId')),
      title: readString(doc.get('title'), 'Loan offer'),
      minAmount: readNumber(
        doc.get('minAmountMinor'),
        readNumber(doc.get('minAmount')),
      ),
      maxAmount: readNumber(
        doc.get('maxAmountMinor'),
        readNumber(doc.get('maxAmount')),
      ),
      minAnnualInterestRate: readNumber(
        doc.get('minInterestRateAnnual'),
        readNumber(doc.get('preferredInterestRate')),
      ),
      maxTenureMonths: readNumber(doc.get('maxTenureMonths')),
      currency: readString(doc.get('currency'), 'LKR'),
      expiresAt: toIso(doc.get('expiresAt')),
    }));
  }

  private async getKycStatus(userId: string) {
    const [userSnapshot, submissions] = await Promise.all([
      this.db.collection('users').doc(userId).get(),
      this.db
        .collection('kycSubmissions')
        .where('userId', '==', userId)
        .limit(20)
        .get(),
    ]);
    const latest = submissions.docs
      .map((doc) => ({
        submissionId: doc.id,
        status: readString(doc.get('status'), 'unknown').toLowerCase(),
        submittedAt: toIso(doc.get('submittedAt') ?? doc.get('createdAt')),
      }))
      .sort(
        (a, b) =>
          (new Date(String(b.submittedAt)).getTime() || 0) -
          (new Date(String(a.submittedAt)).getTime() || 0),
      )[0];
    return {
      accountKycStatus: readString(
        userSnapshot.get('kycStatus'),
        'not_submitted',
      ).toLowerCase(),
      latestSubmission: latest ?? null,
    };
  }

  private async listDisputes(userId: string) {
    const [opened, complainant, respondent] = await Promise.all([
      this.db
        .collection('disputes')
        .where('openedByUserId', '==', userId)
        .limit(20)
        .get(),
      this.db
        .collection('disputes')
        .where('complainantId', '==', userId)
        .limit(20)
        .get(),
      this.db
        .collection('disputes')
        .where('respondentId', '==', userId)
        .limit(20)
        .get(),
    ]);
    const docs = Array.from(
      new Map(
        [...opened.docs, ...complainant.docs, ...respondent.docs].map((doc) => [
          doc.id,
          doc,
        ]),
      ).values(),
    );
    return docs.slice(0, 10).map((doc) => ({
      disputeId: doc.id,
      loanId: readString(doc.get('loanId')),
      category: readString(doc.get('category'), 'other').toLowerCase(),
      subject: readString(doc.get('subject'), 'Dispute'),
      status: readString(doc.get('status'), 'open').toLowerCase(),
      createdAt: toIso(doc.get('createdAt')),
      updatedAt: toIso(doc.get('updatedAt')),
    }));
  }
}
