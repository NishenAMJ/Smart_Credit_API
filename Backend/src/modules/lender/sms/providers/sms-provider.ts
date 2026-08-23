export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

export type SendSmsProviderInput = {
  to: string;
  message: string;
};

export interface SmsProvider {
  isConfigured(): boolean;
  getSenderId(): string | null;
  send(input: SendSmsProviderInput): Promise<string | null>;
}
