// modules/borrower/borrower.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { LoansService } from '../loans/loans.service';
import { FieldValue } from 'firebase-admin/firestore';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { FilterLoansDto } from './dto/filter-loans.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UploadReceiptDto } from './dto/upload-receipt.dto';
import { GenerateQrDto } from './dto/generate-qr.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class BorrowerService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly loansService: LoansService,
  ) {}

  // ==================== LOAN DISCOVERY ====================

  // GET /api/borrower/loans/search?keyword=medical
  async searchLoans(keyword: string) {
    try {
      if (!keyword || keyword.trim() === '') {
        throw new BadRequestException('Search keyword is required');
      }

      const snapshot = await this.firebaseService.db
        .collection('loans')
        .where('status', '==', 'active')
        .get();

      if (snapshot.empty) {
        return {
          statusCode: 200,
          message: 'No loans found',
          keyword,
          total: 0,
          data: [],
        };
      }

      const keywordLower = keyword.toLowerCase().trim();

      const loans = snapshot.docs
        .map((doc) => ({
          loanId: doc.id,
          ...doc.data(),
        }))
        .filter((loan: any) => {
          const titleMatch = loan.title?.toLowerCase().includes(keywordLower);
          const descMatch = loan.description
            ?.toLowerCase()
            .includes(keywordLower);
          const lenderMatch = loan.lenderName
            ?.toLowerCase()
            .includes(keywordLower);

          return titleMatch || descMatch || lenderMatch;
        });

      return {
        statusCode: 200,
        message: 'Search completed successfully',
        keyword,
        total: loans.length,
        data: loans,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('Search loans error:', error);
      throw new InternalServerErrorException('Failed to search loans');
    }
  }

  // GET /api/borrower/loans/featured
  async getFeaturedLoans() {
    try {
      const snapshot = await this.firebaseService.db
        .collection('loans')
        .where('status', '==', 'active')
        .where('featured', '==', true)
        .limit(10)
        .get();

      const loans = snapshot.docs.map((doc) => ({
        loanId: doc.id,
        ...doc.data(),
      }));

      return {
        statusCode: 200,
        message: 'Featured loans retrieved successfully',
        total: loans.length,
        data: loans,
      };
    } catch (error) {
      console.error('Get featured loans error:', error);
      throw new InternalServerErrorException('Failed to get featured loans');
    }
  }

  // GET /api/borrower/loans/:loanId
  async getLoanById(loanId: string) {
    try {
      const loan = await this.loansService.getLoanById(loanId);
      if (!loan) {
        throw new NotFoundException(`Loan with ID ${loanId} not found`);
      }
      return {
        statusCode: 200,
        message: 'Loan retrieved successfully',
        data: loan,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Get loan by ID error:', error);
      throw new InternalServerErrorException('Failed to get loan');
    }
  }

  // POST /api/borrower/loans/filter
  async filterLoans(filterDto: FilterLoansDto) {
    try {
      let query: any = this.firebaseService.db.collection('loans');

      // Apply status filter
      if (filterDto.status) {
        query = query.where('status', '==', filterDto.status);
      }

      const snapshot = await query.get();
      let loans = snapshot.docs.map((doc) => ({
        loanId: doc.id,
        ...doc.data(),
      }));

      // Apply client-side filters
      if (filterDto.minAmount !== undefined) {
        loans = loans.filter(
          (loan: any) => loan.amount >= filterDto.minAmount!,
        );
      }
      if (filterDto.maxAmount !== undefined) {
        loans = loans.filter(
          (loan: any) => loan.amount <= filterDto.maxAmount!,
        );
      }
      if (filterDto.minInterestRate !== undefined) {
        loans = loans.filter(
          (loan: any) => loan.interestRate >= filterDto.minInterestRate!,
        );
      }
      if (filterDto.maxInterestRate !== undefined) {
        loans = loans.filter(
          (loan: any) => loan.interestRate <= filterDto.maxInterestRate!,
        );
      }
      if (filterDto.minDuration !== undefined) {
        loans = loans.filter(
          (loan: any) => loan.durationMonths >= filterDto.minDuration!,
        );
      }
      if (filterDto.maxDuration !== undefined) {
        loans = loans.filter(
          (loan: any) => loan.durationMonths <= filterDto.maxDuration!,
        );
      }
      if (filterDto.category) {
        loans = loans.filter(
          (loan: any) => loan.category === filterDto.category,
        );
      }

      return {
        statusCode: 200,
        message: 'Loans filtered successfully',
        total: loans.length,
        filters: filterDto,
        data: loans,
      };
    } catch (error) {
      console.error('Filter loans error:', error);
      throw new InternalServerErrorException('Failed to filter loans');
    }
  }

  // ==================== LOAN APPLICATION ====================

  // GET /api/borrower/applications
  async getAllApplications(borrowerId?: string) {
    try {
      let query: any = this.firebaseService.db.collection('applications');

      if (borrowerId) {
        query = query.where('borrowerId', '==', borrowerId);
      }

      const snapshot = await query.get();
      const applications = snapshot.docs.map((doc) => ({
        applicationId: doc.id,
        ...doc.data(),
      }));

      return {
        statusCode: 200,
        message: 'Applications retrieved successfully',
        total: applications.length,
        data: applications,
      };
    } catch (error) {
      console.error('Get all applications error:', error);
      throw new InternalServerErrorException('Failed to get applications');
    }
  }

  // GET /api/borrower/applications/:applicationId
  async getApplicationById(applicationId: string) {
    try {
      const doc = await this.firebaseService.db
        .collection('applications')
        .doc(applicationId)
        .get();

      if (!doc.exists) {
        throw new NotFoundException(
          `Application with ID ${applicationId} not found`,
        );
      }

      return {
        statusCode: 200,
        message: 'Application retrieved successfully',
        data: { applicationId: doc.id, ...doc.data() },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Get application by ID error:', error);
      throw new InternalServerErrorException('Failed to get application');
    }
  }

  // POST /api/borrower/applications
  async createApplication(createApplicationDto: CreateApplicationDto) {
    try {
      const docRef = await this.firebaseService.db
        .collection('applications')
        .add({
          ...createApplicationDto,
          status: 'PENDING',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

      return {
        statusCode: 201,
        message: 'Application created successfully',
        data: { applicationId: docRef.id },
      };
    } catch (error) {
      console.error('Create application error:', error);
      throw new InternalServerErrorException('Failed to create application');
    }
  }

  // PUT /api/borrower/applications/:applicationId
  async updateApplication(
    applicationId: string,
    updateApplicationDto: UpdateApplicationDto,
  ) {
    try {
      const docRef = this.firebaseService.db
        .collection('applications')
        .doc(applicationId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new NotFoundException(
          `Application with ID ${applicationId} not found`,
        );
      }

      await docRef.update({
        ...updateApplicationDto,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        statusCode: 200,
        message: 'Application updated successfully',
        data: { applicationId },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Update application error:', error);
      throw new InternalServerErrorException('Failed to update application');
    }
  }

  // DELETE /api/borrower/applications/:applicationId
  async deleteApplication(applicationId: string) {
    try {
      const docRef = this.firebaseService.db
        .collection('applications')
        .doc(applicationId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new NotFoundException(
          `Application with ID ${applicationId} not found`,
        );
      }

      await docRef.delete();

      return {
        statusCode: 200,
        message: 'Application deleted successfully',
        data: { applicationId },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Delete application error:', error);
      throw new InternalServerErrorException('Failed to delete application');
    }
  }

  // ==================== CREDIT SCORE ====================

  // GET /api/borrower/credit-score
  async getCreditScore(borrowerId: string) {
    try {
      const doc = await this.firebaseService.db
        .collection('creditScores')
        .doc(borrowerId)
        .get();

      if (!doc.exists) {
        return {
          statusCode: 200,
          message: 'No credit score found',
          data: { borrowerId, score: 0, rating: 'N/A' },
        };
      }

      return {
        statusCode: 200,
        message: 'Credit score retrieved successfully',
        data: { borrowerId, ...doc.data() },
      };
    } catch (error) {
      console.error('Get credit score error:', error);
      throw new InternalServerErrorException('Failed to get credit score');
    }
  }

  // GET /api/borrower/credit-score/history
  async getCreditScoreHistory(borrowerId: string) {
    try {
      const snapshot = await this.firebaseService.db
        .collection('creditScoreHistory')
        .where('borrowerId', '==', borrowerId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        statusCode: 200,
        message: 'Credit score history retrieved successfully',
        total: history.length,
        data: history,
      };
    } catch (error) {
      console.error('Get credit score history error:', error);
      throw new InternalServerErrorException(
        'Failed to get credit score history',
      );
    }
  }

  // GET /api/borrower/credit-score/factors
  async getCreditScoreFactors(borrowerId: string) {
    try {
      const doc = await this.firebaseService.db
        .collection('creditScores')
        .doc(borrowerId)
        .get();

      if (!doc.exists) {
        return {
          statusCode: 200,
          message: 'No credit score factors found',
          data: { borrowerId, factors: [] },
        };
      }

      const data: any = doc.data();

      return {
        statusCode: 200,
        message: 'Credit score factors retrieved successfully',
        data: {
          borrowerId,
          factors: data.factors || [],
          breakdown: data.breakdown || {},
        },
      };
    } catch (error) {
      console.error('Get credit score factors error:', error);
      throw new InternalServerErrorException(
        'Failed to get credit score factors',
      );
    }
  }

  // ==================== REPAYMENT ====================

  // GET /api/borrower/payments
  async getAllPayments(borrowerId?: string) {
    try {
      let query: any = this.firebaseService.db.collection('payments');

      if (borrowerId) {
        query = query.where('borrowerId', '==', borrowerId);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();
      const payments = snapshot.docs.map((doc) => ({
        paymentId: doc.id,
        ...doc.data(),
      }));

      return {
        statusCode: 200,
        message: 'Payments retrieved successfully',
        total: payments.length,
        data: payments,
      };
    } catch (error) {
      console.error('Get all payments error:', error);
      throw new InternalServerErrorException('Failed to get payments');
    }
  }

  // GET /api/borrower/payments/:paymentId
  async getPaymentById(paymentId: string) {
    try {
      const doc = await this.firebaseService.db
        .collection('payments')
        .doc(paymentId)
        .get();

      if (!doc.exists) {
        throw new NotFoundException(`Payment with ID ${paymentId} not found`);
      }

      return {
        statusCode: 200,
        message: 'Payment retrieved successfully',
        data: { paymentId: doc.id, ...doc.data() },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Get payment by ID error:', error);
      throw new InternalServerErrorException('Failed to get payment');
    }
  }

  // POST /api/borrower/payments
  async createPayment(createPaymentDto: CreatePaymentDto) {
    try {
      // Create payment record
      const docRef = await this.firebaseService.db.collection('payments').add({
        ...createPaymentDto,
        status: 'PENDING',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update loan balance
      await this.loansService.updateBalance(
        createPaymentDto.loanId,
        createPaymentDto.amount,
      );

      return {
        statusCode: 201,
        message: 'Payment created successfully',
        data: { paymentId: docRef.id },
      };
    } catch (error) {
      console.error('Create payment error:', error);
      throw new InternalServerErrorException('Failed to create payment');
    }
  }

  // POST /api/borrower/payments/qr-generate
  async generateQrCode(generateQrDto: GenerateQrDto) {
    try {
      // Generate QR code data (simplified - in production use a proper QR library)
      const qrData = {
        loanId: generateQrDto.loanId,
        amount: generateQrDto.amount,
        borrowerId: generateQrDto.borrowerId,
        timestamp: Date.now(),
      };

      const qrString = Buffer.from(JSON.stringify(qrData)).toString('base64');

      return {
        statusCode: 200,
        message: 'QR code generated successfully',
        data: {
          qrCode: qrString,
          qrData,
        },
      };
    } catch (error) {
      console.error('Generate QR code error:', error);
      throw new InternalServerErrorException('Failed to generate QR code');
    }
  }

  // POST /api/borrower/payments/upload-receipt
  async uploadReceipt(uploadReceiptDto: UploadReceiptDto) {
    try {
      const paymentRef = this.firebaseService.db
        .collection('payments')
        .doc(uploadReceiptDto.paymentId);
      const doc = await paymentRef.get();

      if (!doc.exists) {
        throw new NotFoundException(
          `Payment with ID ${uploadReceiptDto.paymentId} not found`,
        );
      }

      await paymentRef.update({
        receiptUrl: uploadReceiptDto.receiptUrl,
        receiptNotes: uploadReceiptDto.notes,
        receiptUploadedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        statusCode: 200,
        message: 'Receipt uploaded successfully',
        data: { paymentId: uploadReceiptDto.paymentId },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Upload receipt error:', error);
      throw new InternalServerErrorException('Failed to upload receipt');
    }
  }

  // ==================== TRANSACTION HISTORY ====================

  // GET /api/borrower/transactions
  async getAllTransactions(borrowerId?: string) {
    try {
      let query: any = this.firebaseService.db.collection('transactions');

      if (borrowerId) {
        query = query.where('borrowerId', '==', borrowerId);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();
      const transactions = snapshot.docs.map((doc) => ({
        transactionId: doc.id,
        ...doc.data(),
      }));

      return {
        statusCode: 200,
        message: 'Transactions retrieved successfully',
        total: transactions.length,
        data: transactions,
      };
    } catch (error) {
      console.error('Get all transactions error:', error);
      throw new InternalServerErrorException('Failed to get transactions');
    }
  }

  // GET /api/borrower/transactions/:transactionId
  async getTransactionById(transactionId: string) {
    try {
      const doc = await this.firebaseService.db
        .collection('transactions')
        .doc(transactionId)
        .get();

      if (!doc.exists) {
        throw new NotFoundException(
          `Transaction with ID ${transactionId} not found`,
        );
      }

      return {
        statusCode: 200,
        message: 'Transaction retrieved successfully',
        data: { transactionId: doc.id, ...doc.data() },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Get transaction by ID error:', error);
      throw new InternalServerErrorException('Failed to get transaction');
    }
  }

  // GET /api/borrower/payment-schedule/:loanId
  async getPaymentSchedule(loanId: string) {
    try {
      const snapshot = await this.firebaseService.db
        .collection('paymentSchedule')
        .where('loanId', '==', loanId)
        .orderBy('dueDate', 'asc')
        .get();

      const schedule = snapshot.docs.map((doc) => ({
        scheduleId: doc.id,
        ...doc.data(),
      }));

      return {
        statusCode: 200,
        message: 'Payment schedule retrieved successfully',
        loanId,
        total: schedule.length,
        data: schedule,
      };
    } catch (error) {
      console.error('Get payment schedule error:', error);
      throw new InternalServerErrorException('Failed to get payment schedule');
    }
  }

  // ==================== CHAT & COMMUNICATION ====================

  // GET /api/borrower/chat/conversations
  async getAllConversations(borrowerId: string) {
    try {
      const snapshot = await this.firebaseService.db
        .collection('conversations')
        .where('participants', 'array-contains', borrowerId)
        .orderBy('lastMessageAt', 'desc')
        .get();

      const conversations = snapshot.docs.map((doc) => ({
        conversationId: doc.id,
        ...doc.data(),
      }));

      return {
        statusCode: 200,
        message: 'Conversations retrieved successfully',
        total: conversations.length,
        data: conversations,
      };
    } catch (error) {
      console.error('Get all conversations error:', error);
      throw new InternalServerErrorException('Failed to get conversations');
    }
  }

  // GET /api/borrower/chat/:conversationId
  async getConversationMessages(conversationId: string) {
    try {
      const snapshot = await this.firebaseService.db
        .collection('messages')
        .where('conversationId', '==', conversationId)
        .orderBy('createdAt', 'asc')
        .get();

      const messages = snapshot.docs.map((doc) => ({
        messageId: doc.id,
        ...doc.data(),
      }));

      return {
        statusCode: 200,
        message: 'Messages retrieved successfully',
        conversationId,
        total: messages.length,
        data: messages,
      };
    } catch (error) {
      console.error('Get conversation messages error:', error);
      throw new InternalServerErrorException('Failed to get messages');
    }
  }

  // POST /api/borrower/chat/send
  async sendMessage(sendMessageDto: SendMessageDto) {
    try {
      const docRef = await this.firebaseService.db.collection('messages').add({
        ...sendMessageDto,
        createdAt: FieldValue.serverTimestamp(),
        read: false,
      });

      // Update conversation's last message
      await this.firebaseService.db
        .collection('conversations')
        .doc(sendMessageDto.conversationId)
        .update({
          lastMessage: sendMessageDto.message,
          lastMessageAt: FieldValue.serverTimestamp(),
        });

      return {
        statusCode: 201,
        message: 'Message sent successfully',
        data: { messageId: docRef.id },
      };
    } catch (error) {
      console.error('Send message error:', error);
      throw new InternalServerErrorException('Failed to send message');
    }
  }

  // ==================== NOTIFICATIONS ====================

  // GET /api/borrower/notifications
  async getAllNotifications(borrowerId: string) {
    try {
      const snapshot = await this.firebaseService.db
        .collection('notifications')
        .where('userId', '==', borrowerId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const notifications = snapshot.docs.map((doc) => ({
        notificationId: doc.id,
        ...doc.data(),
      }));

      return {
        statusCode: 200,
        message: 'Notifications retrieved successfully',
        total: notifications.length,
        data: notifications,
      };
    } catch (error) {
      console.error('Get all notifications error:', error);
      throw new InternalServerErrorException('Failed to get notifications');
    }
  }

  // PUT /api/borrower/notifications/:notificationId/read
  async markNotificationAsRead(notificationId: string) {
    try {
      const docRef = this.firebaseService.db
        .collection('notifications')
        .doc(notificationId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new NotFoundException(
          `Notification with ID ${notificationId} not found`,
        );
      }

      await docRef.update({
        read: true,
        readAt: FieldValue.serverTimestamp(),
      });

      return {
        statusCode: 200,
        message: 'Notification marked as read',
        data: { notificationId },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Mark notification as read error:', error);
      throw new InternalServerErrorException(
        'Failed to mark notification as read',
      );
    }
  }

  // DELETE /api/borrower/notifications/:notificationId
  async deleteNotification(notificationId: string) {
    try {
      const docRef = this.firebaseService.db
        .collection('notifications')
        .doc(notificationId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new NotFoundException(
          `Notification with ID ${notificationId} not found`,
        );
      }

      await docRef.delete();

      return {
        statusCode: 200,
        message: 'Notification deleted successfully',
        data: { notificationId },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Delete notification error:', error);
      throw new InternalServerErrorException('Failed to delete notification');
    }
  }
}
