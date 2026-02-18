export class CreateLoanOfferDto {
  lenderId: string;
  amount: number;
  interestRate: number;
  tenure: number; // in months
  minCreditScore?: number;
  description?: string;
  termsAndConditions?: string;
}
