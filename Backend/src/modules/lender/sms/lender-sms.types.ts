export type LenderSmsSettings = {
  enabled: boolean;
  configured: boolean;
  sender: string | null;
  updatedAt: string | null;
  paymentReceived: PaymentReceivedSmsSettings;
};

export type PaymentReceivedSmsSettings = {
  enabled: boolean;
  template: string;
  updatedAt: string | null;
};

export type UpdatePaymentReceivedSmsInput = {
  enabled?: boolean;
  template?: string;
};

export type SmsBorrower = {
  borrowerId: string;
  fullName: string;
  email: string;
  phone: string;
};

export type SmsBorrowerSearchResponse = {
  borrowers: SmsBorrower[];
};

export type SendSmsInput = {
  borrowerIds?: string[];
  message?: string;
};

export type SmsDeliveryResult = {
  borrowerId: string;
  phone: string;
  status: 'sent' | 'failed';
  providerMessageId: string | null;
  error: string | null;
};

export type SendSmsResponse = {
  attempted: number;
  sent: number;
  failed: number;
  results: SmsDeliveryResult[];
};
