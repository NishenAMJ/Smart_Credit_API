export class UpdateLoanOfferDto {
  amount?: number;
  interestRate?: number;
  tenure?: number;
  minCreditScore?: number;
  description?: string;
  termsAndConditions?: string;
  status?: 'active' | 'inactive' | 'fulfilled';
}
