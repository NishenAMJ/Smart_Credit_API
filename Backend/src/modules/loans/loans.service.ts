// modules/loans/loans.service.ts
import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { FieldValue } from 'firebase-admin/firestore';
import { CreateLoanDto } from './dto/create-loan.dto';

@Injectable()
export class LoansService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async createLoan(createLoanDto: CreateLoanDto) {
    const docRef = await this.firebaseService.db.collection('loans').add({
      ...createLoanDto,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { id: docRef.id };
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
    const snapshot = await this.firebaseService.db.collection('loans').get();
    const loans = snapshot.docs.map((doc) => doc.data());

    return {
      totalLoans: loans.length,
      activeLoans: loans.filter((l: any) => l.status === 'ACTIVE').length,
      completedLoans: loans.filter((l: any) => l.status === 'COMPLETED').length,
      totalAmount: loans.reduce(
        (sum: number, l: any) => sum + (l.amount || 0),
        0,
      ),
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
