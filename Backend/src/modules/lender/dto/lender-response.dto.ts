export class LenderResponseDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  investmentCapacity: number;
  riskPreference: string;
  address?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class LoanOfferResponseDto {
  id: string;
  lenderId: string;
  amount: number;
  interestRate: number;
  tenure: number;
  minCreditScore?: number;
  description?: string;
  termsAndConditions?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DashboardStatsDto {
  totalActiveOffers: number;
  totalAmountOffered: number;
  totalLoansIssued: number;
  totalReturns: number;
  activeLoansCount: number;
}
