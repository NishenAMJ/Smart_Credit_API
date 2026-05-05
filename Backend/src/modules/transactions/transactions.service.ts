import { Injectable } from '@nestjs/common';
import {
  DocumentData,
  DocumentReference,
  QuerySnapshot,
  Timestamp,
} from 'firebase-admin/firestore';
import { Observable } from 'rxjs';
import { FirebaseService } from '../../firebase/firebase.service';
import { rethrowFirebaseError } from '../../common/firebase-error';

@Injectable()
export class TransactionsService {
  private static readonly MAX_PAGE_SIZE = 100;

  constructor(private readonly firebaseService: FirebaseService) {}

  // Fetch a page of transactions for the admin table.
  async getTransactions(
    limit = 25,
    cursor?: string,
  ): Promise<TransactionsResponse> {
    try {
      let query: FirebaseFirestore.Query = this.firebaseService.db
        .collection('transactions')
        .orderBy('createdAt', 'desc')
        .limit(Math.min(limit, TransactionsService.MAX_PAGE_SIZE) + 1);

      if (cursor) {
        const cursorDoc = await this.firebaseService.db
          .collection('transactions')
          .doc(cursor)
          .get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.get();
      return this.buildTransactionsResponse(
        snapshot,
        Math.min(limit, TransactionsService.MAX_PAGE_SIZE),
      );
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to load transactions');
    }
  }

  // Keep sending transaction updates whenever the collection changes.
  streamTransactions(limit = 100): Observable<{ data: TransactionsResponse }> {
    return new Observable((subscriber) => {
      const query = this.firebaseService.db
        .collection('transactions')
        .orderBy('createdAt', 'desc')
        .limit(limit);

      const unsubscribe = query.onSnapshot(
        async (snapshot) => {
          try {
            subscriber.next({
              data: await this.buildTransactionsResponse(snapshot),
            });
          } catch (error) {
            subscriber.next({
              data: {
                success: false,
                count: 0,
                totalAmount: 0,
                transactions: [],
                error: this.getErrorMessage(error),
              },
            });
          }
        },
        (error) => {
          subscriber.next({
            data: {
              success: false,
              count: 0,
              totalAmount: 0,
              transactions: [],
              error: this.getErrorMessage(error),
            },
          });
        },
      );

      return () => unsubscribe();
    });
  }

  // Build the final response object for one transaction page.
  private async buildTransactionsResponse(
    snapshot: QuerySnapshot,
    limit = snapshot.size,
  ): Promise<TransactionsResponse> {
    const pageDocs = snapshot.docs.slice(0, limit);
    const usersById = await this.getUsersById(pageDocs);
    const transactions = pageDocs.map((doc) =>
      this.toTransactionRecord(doc.id, doc.data(), usersById),
    );
    const totalAmount = transactions.reduce(
      (total, transaction) => total + transaction.amount,
      0,
    );

    return {
      success: true,
      count: transactions.length,
      totalAmount,
      transactions,
      hasMore: snapshot.size > limit,
      nextCursor:
        snapshot.size > limit ? pageDocs[pageDocs.length - 1]?.id : undefined,
    };
  }

  // Load related users so lender and borrower names can be shown.
  private async getUsersById(
    docs: Array<{ data(): DocumentData }>,
  ): Promise<Record<string, UserSummary>> {
    const ids = new Set<string>();

    docs.forEach((doc) => {
      const transaction = doc.data();
      if (typeof transaction.lenderId === 'string')
        ids.add(transaction.lenderId);
      if (typeof transaction.borrowerId === 'string')
        ids.add(transaction.borrowerId);
    });

    if (!ids.size) {
      return {};
    }

    const refs: Array<DocumentReference<DocumentData>> = [...ids].map((id) =>
      this.firebaseService.db.collection('users').doc(id),
    );
    const userDocs = await this.firebaseService.db.getAll(...refs);

    return userDocs.reduce<Record<string, UserSummary>>((users, doc) => {
      if (!doc.exists) {
        return users;
      }

      const user = doc.data() ?? {};
      users[doc.id] = {
        id: doc.id,
        email: typeof user.email === 'string' ? user.email : undefined,
        name: this.getUserName(user, doc.id),
      };

      return users;
    }, {});
  }

  // Convert one Firestore transaction document into a response row.
  private toTransactionRecord(
    id: string,
    transaction: DocumentData,
    usersById: Record<string, UserSummary>,
  ): TransactionRecord {
    const lenderId = this.asString(transaction.lenderId);
    const borrowerId = this.asString(transaction.borrowerId);
    const lender = lenderId ? usersById[lenderId] : undefined;
    const borrower = borrowerId ? usersById[borrowerId] : undefined;

    return {
      id,
      transactionId: this.asString(transaction.transactionId) ?? id,
      loanId: this.asString(transaction.loanId),
      lenderId,
      lenderName:
        this.asString(transaction.lenderName) ?? lender?.name ?? lenderId,
      lenderEmail: this.asString(transaction.lenderEmail) ?? lender?.email,
      borrowerId,
      borrowerName:
        this.asString(transaction.borrowerName) ?? borrower?.name ?? borrowerId,
      borrowerEmail:
        this.asString(transaction.borrowerEmail) ?? borrower?.email,
      amount: this.asNumber(transaction.amount),
      platformFee: this.asNumber(transaction.platformFee ?? transaction.fee),
      paymentType:
        this.asString(transaction.paymentType) ??
        this.asString(transaction.type) ??
        'manual',
      status: this.getTransactionStatus(transaction),
      verifiedByLender: transaction.verifiedByLender === true,
      createdAt: this.toIsoDate(transaction.createdAt),
      paidAt: this.toIsoDate(transaction.paidAt),
      updatedAt: this.toIsoDate(transaction.updatedAt),
    };
  }

  // Decide which status should be shown in the admin list.
  private getTransactionStatus(transaction: DocumentData): TransactionStatus {
    const status = this.asString(transaction.status);

    if (status) {
      return status as TransactionStatus;
    }

    return transaction.verifiedByLender === true ? 'completed' : 'pending';
  }

  // Pick the best available display name for a user.
  private getUserName(user: DocumentData, fallback: string): string {
    const fullName = this.asString(user.fullName);
    const firstName = this.asString(user.firstName);
    const lastName = this.asString(user.lastName);

    if (fullName) {
      return fullName;
    }

    if (firstName || lastName) {
      return [firstName, lastName].filter(Boolean).join(' ');
    }

    return this.asString(user.email) ?? fallback;
  }

  // Safely convert any value into a number.
  private asNumber(value: unknown): number {
    const numberValue = Number(value ?? 0);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  // Safely convert any value into a trimmed string.
  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  // Convert Firestore timestamps or date-like values into ISO strings.
  private toIsoDate(value: unknown): string | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof Timestamp) {
      return value.toDate().toISOString();
    }

    if (
      typeof value === 'object' &&
      'toDate' in value &&
      typeof value.toDate === 'function'
    ) {
      return value.toDate().toISOString();
    }

    if (typeof value === 'string') {
      return value;
    }

    return undefined;
  }

  // Turn any thrown error into a readable SSE fallback message.
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

export type TransactionStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | string;

export interface TransactionRecord {
  id: string;
  transactionId: string;
  loanId?: string;
  lenderId?: string;
  lenderName?: string;
  lenderEmail?: string;
  borrowerId?: string;
  borrowerName?: string;
  borrowerEmail?: string;
  amount: number;
  platformFee: number;
  paymentType: string;
  status: TransactionStatus;
  verifiedByLender: boolean;
  createdAt?: string;
  paidAt?: string;
  updatedAt?: string;
}

export interface TransactionsResponse {
  success: boolean;
  count: number;
  totalAmount: number;
  transactions: TransactionRecord[];
  hasMore?: boolean;
  nextCursor?: string;
  error?: string;
}

interface UserSummary {
  id: string;
  name: string;
  email?: string;
}
