import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { ScanPaymentSlipDto } from './dto/scan-payment-slip.dto';
import { QrScanResponse } from './interfaces/qr-scan-response.interface';
import { PaymentSlipData } from './interfaces/payment-slip-data.interface';
import { rethrowFirebaseError } from '../../common/firebase-error';
import { Timestamp } from 'firebase-admin/firestore';

@Injectable()
export class QrScannerService {
  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Process QR code scan from payment slip and update borrower payment status
   * @param scanData - Scanned QR data with loan and payment details
   * @param scannedByUserId - Lender ID who performed the scan
   * @returns QrScanResponse with payment update status
   */
  async processPaymentSlipScan(
    scanData: ScanPaymentSlipDto,
    scannedByUserId: string,
  ): Promise<QrScanResponse> {
    try {
      // Validate loan exists and is active
      const loanRef = this.firebaseService.db
        .collection('loans')
        .doc(scanData.loanId);
      const loanDoc = await loanRef.get();

      if (!loanDoc.exists) {
        throw new NotFoundException(`Loan ${scanData.loanId} not found`);
      }

      const loanData = loanDoc.data();

      if (!loanData) {
        throw new NotFoundException(`Loan ${scanData.loanId} has no data`);
      }

      // Verify borrower ID matches
      if (loanData.borrowerId !== scanData.borrowerId) {
        throw new BadRequestException(
          'Borrower ID does not match the loan record',
        );
      }

      // Verify lender scanned (should be the lender of this loan)
      if (loanData.lenderId !== scannedByUserId) {
        throw new BadRequestException(
          'Only the loan lender can scan payments',
        );
      }

      // Get next installment that needs payment
      const installment = await this.getNextPendingInstallment(
        scanData.loanId,
      );

      if (!installment) {
        throw new BadRequestException(
          'No pending installments found for this loan',
        );
      }

      // Verify payment amount matches installment amount
      if (Math.abs(scanData.amount - installment.amount) > 0.01) {
        throw new BadRequestException(
          `Payment amount ${scanData.amount} does not match installment amount ${installment.amount}`,
        );
      }

      // Create transaction record
      const transactionId = this.firebaseService.db
        .collection('transactions')
        .doc().id;

      const transactionData = {
        id: transactionId,
        loanId: scanData.loanId,
        borrowerId: scanData.borrowerId,
        lenderId: scannedByUserId,
        installmentId: installment.id,
        amount: scanData.amount,
        paymentMethod: scanData.paymentMethod || 'qr_scan',
        referenceNumber: scanData.referenceNumber,
        qrData: scanData.qrData,
        type: 'payment',
        status: 'completed',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        scannedAt: Timestamp.now(),
      };

      await this.firebaseService.db
        .collection('transactions')
        .doc(transactionId)
        .set(transactionData);

      // Update installment as paid
      await this.markInstallmentAsPaid(scanData.loanId, installment.id);

      // Update borrower payment status
      await this.updateBorrowerPaymentStatus(scanData.borrowerId, {
        lastPaymentDate: new Date().toISOString(),
        lastPaymentAmount: scanData.amount,
        paymentStatus: 'completed',
      });

      // Update loan progress if all installments paid
      await this.updateLoanProgressIfComplete(scanData.loanId);

      return {
        success: true,
        message: 'Payment processed successfully',
        data: {
          loanId: scanData.loanId,
          borrowerId: scanData.borrowerId,
          amount: scanData.amount,
          paymentStatus: 'completed',
          transactionId,
          updatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      rethrowFirebaseError(
        error,
        'Failed to process payment slip scan',
      );
    }
  }

  /**
   * Get the next pending installment for a loan
   */
  private async getNextPendingInstallment(
    loanId: string,
  ): Promise<{ id: string; amount: number; dueDate: string } | null> {
    try {
      const snapshot = await this.firebaseService.db
        .collection('loans')
        .doc(loanId)
        .collection('installments')
        .where('status', '==', 'pending')
        .orderBy('dueDate', 'asc')
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        amount: doc.data().amount,
        dueDate: doc.data().dueDate,
      };
    } catch (error) {
      rethrowFirebaseError(
        error,
        `Failed to fetch pending installment for loan ${loanId}`,
      );
    }
  }

  /**
   * Mark installment as paid
   */
  private async markInstallmentAsPaid(
    loanId: string,
    installmentId: string,
  ): Promise<void> {
    try {
      await this.firebaseService.db
        .collection('loans')
        .doc(loanId)
        .collection('installments')
        .doc(installmentId)
        .update({
          status: 'paid',
          paidAt: Timestamp.now(),
          paidDate: new Date().toISOString(),
          updatedAt: Timestamp.now(),
        });
    } catch (error) {
      rethrowFirebaseError(
        error,
        `Failed to mark installment ${installmentId} as paid`,
      );
    }
  }

  /**
   * Update borrower's payment status in their profile
   */
  private async updateBorrowerPaymentStatus(
    borrowerId: string,
    paymentInfo: {
      lastPaymentDate: string;
      lastPaymentAmount: number;
      paymentStatus: 'completed' | 'pending' | 'failed';
    },
  ): Promise<void> {
    try {
      const borrowerRef = this.firebaseService.db
        .collection('users')
        .doc(borrowerId);
      const borrowerDoc = await borrowerRef.get();

      if (!borrowerDoc.exists) {
        throw new NotFoundException(`Borrower ${borrowerId} not found`);
      }

      const currentData = borrowerDoc.data();

      await borrowerRef.update({
        'paymentHistory.lastPaymentDate': paymentInfo.lastPaymentDate,
        'paymentHistory.lastPaymentAmount': paymentInfo.lastPaymentAmount,
        'paymentHistory.lastPaymentStatus': paymentInfo.paymentStatus,
        'paymentHistory.totalPaymentsMade': (currentData?.paymentHistory?.totalPaymentsMade || 0) + 1,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      rethrowFirebaseError(
        error,
        `Failed to update borrower ${borrowerId} payment status`,
      );
    }
  }

  /**
   * Check if all installments are paid and update loan status
   */
  private async updateLoanProgressIfComplete(loanId: string): Promise<void> {
    try {
      const installmentsSnapshot = await this.firebaseService.db
        .collection('loans')
        .doc(loanId)
        .collection('installments')
        .where('status', '!=', 'paid')
        .get();

      // If no pending installments remain, mark loan as completed
      if (installmentsSnapshot.empty) {
        await this.firebaseService.db
          .collection('loans')
          .doc(loanId)
          .update({
            status: 'completed',
            completedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
      }
    } catch (error) {
      rethrowFirebaseError(
        error,
        `Failed to update loan ${loanId} progress`,
      );
    }
  }

  /**
   * Validate and parse QR code data
   * @param qrData Raw QR code string
   * @returns Parsed payment slip data
   */
  async validateAndParseQrData(qrData: string): Promise<PaymentSlipData> {
    try {
      // QR code should contain structured data (JSON or delimited format)
      // Example format: {"loanId":"...", "borrowerId":"...", "amount":...}
      const parsed = JSON.parse(qrData) as PaymentSlipData;

      if (!parsed.loanId || !parsed.borrowerId || !parsed.amount) {
        throw new BadRequestException(
          'Invalid QR format: missing required fields (loanId, borrowerId, amount)',
        );
      }

      return parsed;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse QR code data: ${error.message}`);
    }
  }

  /**
   * Fetch payment transaction history for a loan
   */
  async getPaymentHistory(
    loanId: string,
    limit = 10,
  ): Promise<{ payments: any[]; count: number }> {
    try {
      const snapshot = await this.firebaseService.db
        .collection('transactions')
        .where('loanId', '==', loanId)
        .where('type', '==', 'payment')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const payments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        payments,
        count: payments.length,
      };
    } catch (error) {
      rethrowFirebaseError(
        error,
        `Failed to fetch payment history for loan ${loanId}`,
      );
    }
  }
}
