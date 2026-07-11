// modules/loans/loans.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { FieldValue } from 'firebase-admin/firestore';
import { CreateLoanDto } from './dto/create-loan.dto';
import { LegalService } from '../legal/legal.service';

@Injectable()
export class LoansService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly legalService: LegalService,
  ) {}

  private hasExpectedRole(
    roleValue: unknown,
    expectedRole: 'borrower' | 'lender',
  ): boolean {
    if (Array.isArray(roleValue)) {
      return roleValue.includes(expectedRole);
    }

    return roleValue === expectedRole;
  }

  private async getCount(query: FirebaseFirestore.Query): Promise<number> {
    const snapshot = await query.count().get();
    return snapshot.data().count;
  }

  private async validateUserRole(
    userId: string,
    expectedRole: 'borrower' | 'lender',
  ) {
    const doc = await this.firebaseService.db
      .collection('users')
      .doc(userId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    const userData = doc.data();
    if (!this.hasExpectedRole(userData?.role, expectedRole)) {
      throw new BadRequestException(
        `User is not a ${expectedRole}. Current role: ${JSON.stringify(
          userData?.role,
        )}`,
      );
    }

    return userData;
  }

  async createLoan(createLoanDto: CreateLoanDto) {
    const lenderData = await this.validateUserRole(
      createLoanDto.lenderId,
      'lender',
    );
    const borrowerData = await this.validateUserRole(
      createLoanDto.borrowerId,
      'borrower',
    );

    const docRef = await this.firebaseService.db.collection('loans').add({
      ...createLoanDto,
      lenderName: lenderData?.fullName,
      borrowerName: borrowerData?.fullName,
      borrowerCreditScore: borrowerData?.creditScore,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (createLoanDto.adId) {
      try {
        await this.firebaseService.db
          .collection('ads')
          .doc(createLoanDto.adId)
          .update({
            status: 'active',
            updatedAt: FieldValue.serverTimestamp(),
          });
      } catch (error) {
        console.error(
          `Failed to update ad status to active for adId: ${createLoanDto.adId}`,
          error,
        );
      }
    }

    let legalDocumentId: string | null = null;

    try {
      const document = await this.legalService.generateLoanAgreement(
        docRef.id,
        createLoanDto.lenderId,
        'lender',
      );
      legalDocumentId = document.id;
    } catch (error) {
      console.error('Automatic legal agreement generation failed:', error);
    }

    return { id: docRef.id, legalDocumentId };
  }

  async getAllLoans() {
    const snapshot = await this.firebaseService.db.collection('loans').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getLoanById(id: string) {
    const doc = await this.firebaseService.db.collection('loans').doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  }

  async updateLoan(id: string, updateData: Partial<CreateLoanDto>) {
    await this.firebaseService.db
      .collection('loans')
      .doc(id)
      .update({
        ...updateData,
        updatedAt: FieldValue.serverTimestamp(),
      });
    return { id };
  }

  async deleteLoan(id: string) {
    await this.firebaseService.db.collection('loans').doc(id).delete();
    return { id };
  }

  async getLoanStatistics() {
    const loansCollection = this.firebaseService.db.collection('loans');
    const [totalLoans, activeLoans, completedLoans, snapshot] =
      await Promise.all([
        this.getCount(loansCollection),
        this.getCount(loansCollection.where('status', 'in', ['active', 'ACTIVE'])),
        this.getCount(
          loansCollection.where('status', 'in', ['completed', 'COMPLETED']),
        ),
        loansCollection.select('amount', 'principalAmount').get(),
      ]);

    const totalAmount = snapshot.docs.reduce((sum: number, doc) => {
      const loan = doc.data();
      return (
        sum +
        Number(
          loan.amount ?? loan.principalAmount ?? 0,
        )
      );
    }, 0);

    return {
      totalLoans,
      activeLoans,
      completedLoans,
      totalAmount,
    };
  }

  async getLoansByBorrowerId(borrowerId: string) {
    const snapshot = await this.firebaseService.db
      .collection('loans')
      .where('borrowerId', '==', borrowerId)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getLoansByLenderId(lenderId: string) {
    const snapshot = await this.firebaseService.db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async checkDefaultStatus(loanId: string) {
    const doc = await this.firebaseService.db
      .collection('loans')
      .doc(loanId)
      .get();
    if (!doc.exists) {
      return false;
    }
    const loanData = doc.data();
    if (!loanData) {
      return false;
    }
    return loanData.status === 'DEFAULT';
  }

  async updateBalance(loanId: string, amountPaid: number) {
    const doc = await this.firebaseService.db
      .collection('loans')
      .doc(loanId)
      .get();
    if (!doc.exists) {
      throw new Error('Loan not found');
    }

    const loanData = doc.data();
    if (!loanData) {
      throw new Error('Loan data is corrupted');
    }

    const newBalance = (loanData.balance || 0) - amountPaid;

    await this.firebaseService.db.collection('loans').doc(loanId).update({
      balance: newBalance,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { id: loanId, newBalance };
  }

  async closeLoan(loanId: string) {
    const doc = await this.firebaseService.db
      .collection('loans')
      .doc(loanId)
      .get();
    if (!doc.exists) {
      throw new Error('Loan not found');
    }

    await this.firebaseService.db.collection('loans').doc(loanId).update({
      status: 'COMPLETED',
      closedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { id: loanId, status: 'COMPLETED' };
  }
}
