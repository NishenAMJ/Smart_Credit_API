import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import {
  readDate,
  readNumber,
  readString,
} from '../../firebase/firestore-query.utils';
import { BorrowerService } from '../borrower/core/borrower.service';
import { InstallmentPaymentService } from '../lender/payments/installment-payment.service';
import { ScanPaymentSlipDto } from './dto/scan-payment-slip.dto';
import { QrScanResponse } from './interfaces/qr-scan-response.interface';
import { PaymentSlipData } from './interfaces/payment-slip-data.interface';

@Injectable()
export class QrScannerService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly borrowerService: BorrowerService,
    private readonly installmentPaymentService: InstallmentPaymentService,
  ) {}

  async processPaymentSlipScan(
    scanData: ScanPaymentSlipDto,
    lenderId: string,
  ): Promise<QrScanResponse> {
    const verification = await this.borrowerService.verifyQrToken(
      scanData.qrData,
      false,
      true,
    );
    const payload = verification.payload;
    const loanRef = this.firebaseService
      .getDb()
      .collection('loans')
      .doc(payload.loanId);
    const loan = await loanRef.get();

    if (!loan.exists || loan.get('lenderId') !== lenderId) {
      throw new NotFoundException('The QR loan was not found for this lender.');
    }
    if (loan.get('borrowerId') !== payload.borrowerId) {
      throw new BadRequestException('The QR borrower does not match the loan.');
    }

    const installments = await loanRef.collection('installments').get();
    const nextInstallment = installments.docs
      .filter((doc) =>
        ['scheduled', 'due', 'overdue'].includes(
          readString(doc.get('status'))?.toLowerCase() ?? '',
        ),
      )
      .sort(
        (left, right) =>
          (readDate(left.get('dueAt'))?.getTime() ?? 0) -
          (readDate(right.get('dueAt'))?.getTime() ?? 0),
      )[0];

    if (!nextInstallment) {
      throw new BadRequestException('This loan has no unpaid installment.');
    }

    const amount = readNumber(nextInstallment.get('amountDueMinor')) / 100;
    if (Math.abs(payload.amount - amount) > 0.009) {
      throw new BadRequestException(
        `The QR amount does not match the next installment amount of ${amount}.`,
      );
    }

    const details = await this.installmentPaymentService.record(
      lenderId,
      payload.loanId,
      nextInstallment.id,
      {
        amount,
        note: 'Recorded from borrower QR code',
        paymentMethod: 'qr',
      },
      { nonce: payload.nonce },
    );
    if (!details) {
      throw new NotFoundException('The loan installment was not found.');
    }

    const transactionId = `repayment_${payload.loanId}_${nextInstallment.id}`;
    return {
      success: true,
      message: 'Payment processed successfully',
      data: {
        loanId: payload.loanId,
        borrowerId: payload.borrowerId,
        amount,
        paymentStatus: 'completed',
        transactionId,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  async validateAndParseQrData(qrData: string): Promise<PaymentSlipData> {
    if (!qrData.trim()) {
      throw new BadRequestException('QR data is required.');
    }
    const verification = await this.borrowerService.verifyQrToken(
      qrData,
      false,
    );
    return {
      loanId: verification.payload.loanId,
      borrowerId: verification.payload.borrowerId,
      amount: verification.payload.amount,
      qrVersion: '1.0',
    };
  }

  async getPaymentHistory(lenderId: string, loanId: string, limit = 10) {
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const loan = await this.firebaseService
      .getDb()
      .collection('loans')
      .doc(loanId)
      .get();
    if (!loan.exists || loan.get('lenderId') !== lenderId) {
      throw new NotFoundException('The loan was not found for this lender.');
    }
    const snapshot = await this.firebaseService
      .getDb()
      .collection('transactions')
      .where('loanId', '==', loanId)
      .where('type', '==', 'repayment')
      .get();
    const payments = snapshot.docs
      .map((doc) => ({
        transactionId: doc.id,
        loanId,
        installmentId: readString(doc.get('installmentId')),
        amount: readNumber(doc.get('amountMinor')) / 100,
        status: readString(doc.get('status')) ?? 'unknown',
        createdAt: readDate(doc.get('createdAt'))?.toISOString() ?? null,
      }))
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, safeLimit);
    return { payments, count: payments.length };
  }
}
