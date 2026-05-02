import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import { Loan, LoanStatus } from './interfaces/borrower.interface';
import { LoanApplicationStatus } from './dto/loan-application.dto';

type TimestampLike =
  | FirebaseFirestore.Timestamp
  | Date
  | { toMillis?: () => number; toDate?: () => Date }
  | null
  | undefined;

@Injectable()
export class BorrowerDashboardService {
  private readonly BORROWERS_COL = 'borrowers';
  private readonly LOANS_COL = 'loans';
  private readonly LOAN_APPS_COL = 'loanRequests';
  private readonly USERS_COL = 'users';

  constructor(private readonly firebaseService: FirebaseService) {}

  private get db() {
    return this.firebaseService.db;
  }

  async getDashboard(borrowerId: string) {
    if (!borrowerId) {
      throw new BadRequestException('Borrower ID is required');
    }

    try {
      const profileDoc = await this.db
        .collection(this.BORROWERS_COL)
        .doc(borrowerId)
        .get();
      let profileData = profileDoc.exists ? profileDoc.data() : null;

      if (!profileData) {
        const userDoc = await this.db
          .collection(this.USERS_COL)
          .doc(borrowerId)
          .get();
        profileData = userDoc.exists ? userDoc.data() : {};
      }

      const loansSnapshot = await this.db
        .collection(this.LOANS_COL)
        .where('borrowerId', '==', borrowerId)
        .get();

      let activeLoansCount = 0;
      let totalOutstanding = 0;
      let totalBorrowed = 0;
      let totalRepaid = 0;
      let nextPaymentAmount = 0;
      let nextDueDate: TimestampLike = null;

      loansSnapshot.forEach((doc) => {
        const data = doc.data();
        const loan = this.normalizeLoanDocument(data, doc.id);

        totalBorrowed += loan.principalAmount || 0;

        const totalRepayable =
          (loan.principalAmount || 0) + this.toNumber(data.totalInterest);
        const repaidOnThisLoan = Math.max(
          0,
          totalRepayable - (loan.outstandingBalance || 0),
        );
        totalRepaid += repaidOnThisLoan;

        if (data.status === LoanStatus.ACTIVE) {
          activeLoansCount++;
          totalOutstanding += loan.outstandingBalance || 0;

          if (loan.nextDueDate) {
            const loanDate = new Date(this.timestampToMillis(loan.nextDueDate));
            const currentNextDate = nextDueDate
              ? new Date(this.timestampToMillis(nextDueDate))
              : null;

            if (!currentNextDate || loanDate < currentNextDate) {
              nextDueDate = loan.nextDueDate;
              nextPaymentAmount = Math.min(
                loan.monthlyInstallment || 0,
                loan.outstandingBalance || 0,
              );
            }
          }
        }
      });

      const appsSnapshot = await this.db
        .collection(this.LOAN_APPS_COL)
        .where('borrowerId', '==', borrowerId)
        .where('status', 'in', [
          LoanApplicationStatus.PENDING,
          'PENDING',
          LoanApplicationStatus.DRAFT,
          'DRAFT',
        ])
        .get();

      const dashboard = {
        profile: profileData,
        activeLoans: activeLoansCount,
        pendingApplications: appsSnapshot.size,
        totalOutstanding,
        nextDueDate,
        nextPaymentAmount,
        creditScore: profileData?.creditScore || 0,
        totalBorrowed,
        totalRepaid,
      };

      return {
        statusCode: 200,
        message: 'Dashboard data retrieved successfully',
        data: dashboard,
      };
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      throw new InternalServerErrorException('Failed to fetch dashboard data');
    }
  }

  private timestampToMillis(value: TimestampLike): number {
    if (!value) {
      return 0;
    }

    if ('toMillis' in value && typeof value.toMillis === 'function') {
      return value.toMillis();
    }

    if ('toDate' in value && typeof value.toDate === 'function') {
      return value.toDate().getTime();
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    return 0;
  }

  private toNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }

  private toTimestamp(value: unknown): FirebaseFirestore.Timestamp | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'object' && value !== null) {
      if ('toDate' in value && typeof value.toDate === 'function') {
        const date = value.toDate();
        if (date instanceof Date) {
          return Timestamp.fromDate(date);
        }
      }
    }

    if (value instanceof Date) {
      return Timestamp.fromDate(value);
    }

    return undefined;
  }

  private normalizeLoanStatus(value: unknown): LoanStatus {
    const status = String(value ?? '').toLowerCase();

    if (Object.values(LoanStatus).includes(status as LoanStatus)) {
      return status as LoanStatus;
    }

    return LoanStatus.ACTIVE;
  }

  private normalizeLoanDocument(
    data: FirebaseFirestore.DocumentData,
    documentId?: string,
  ): Loan {
    const now = Timestamp.now();
    const status = this.normalizeLoanStatus(data.status);
    const createdAt = this.toTimestamp(data.createdAt) ?? now;
    const updatedAt = this.toTimestamp(data.updatedAt) ?? createdAt;
    const startDate = this.toTimestamp(data.startDate) ?? createdAt;
    const nextDueDate = this.toTimestamp(data.nextDueDate) ?? startDate;
    const endDate = this.toTimestamp(data.endDate) ?? nextDueDate;

    const principalAmount = this.toNumber(data.principalAmount);
    const tenureMonths = this.toNumber(data.tenureMonths);
    const totalRepayable = this.toNumber(
      data.totalRepayable,
      principalAmount + this.toNumber(data.totalInterest),
    );
    const monthlyInstallment = this.toNumber(
      data.monthlyInstallment,
      tenureMonths > 0 ? Math.round(totalRepayable / tenureMonths) : 0,
    );
    const outstandingBalance = this.toNumber(
      data.outstandingBalance,
      status === LoanStatus.COMPLETED ? 0 : totalRepayable || principalAmount,
    );

    return {
      loanId: String(data.loanId ?? documentId ?? ''),
      requestId: String(data.requestId ?? ''),
      borrowerId: String(data.borrowerId ?? ''),
      lenderId: String(data.lenderId ?? ''),
      lenderName: data.lenderName ? String(data.lenderName) : undefined,
      principalAmount,
      interestRate: this.toNumber(data.interestRate),
      tenureMonths,
      monthlyInstallment,
      outstandingBalance,
      totalInterest: this.toNumber(
        data.totalInterest,
        Math.max(0, totalRepayable - principalAmount),
      ),
      status,
      startDate,
      nextDueDate,
      endDate,
      repaymentsMade: this.toNumber(data.repaymentsMade),
      createdAt,
      updatedAt,
    };
  }
}
