export interface QrScanResponse {
  success: boolean;
  message: string;
  data?: {
    loanId: string;
    borrowerId: string;
    amount: number;
    paymentStatus: 'completed' | 'pending' | 'failed';
    transactionId?: string;
    updatedAt: string;
  };
  error?: string;
}
