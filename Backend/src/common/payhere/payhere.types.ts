export type PayHereOrderStatus =
  | 'initiated'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'charged_back'
  | 'expired'
  | 'processing_failed';

export type PayHereNotification = {
  merchant_id?: string;
  order_id?: string;
  payment_id?: string;
  payhere_amount?: string;
  payhere_currency?: string;
  status_code?: string;
  md5sig?: string;
  method?: string;
  status_message?: string;
};

export type VerifiedPayHereNotification = {
  orderId: string;
  paymentId: string | null;
  amountMinor: number;
  currency: string;
  statusCode: string;
  status: PayHereOrderStatus;
  eventId: string;
  sanitized: Record<string, string | null>;
};

export type PayHereRetrievedPayment = {
  paymentId: string;
  orderId: string;
  status:
    | 'RECEIVED'
    | 'REFUND REQUESTED'
    | 'REFUND PROCESSING'
    | 'REFUNDED'
    | 'CHARGEBACKED';
  amountMinor: number;
  currency: string;
};
