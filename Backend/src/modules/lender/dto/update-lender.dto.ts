export class UpdateLenderDto {
  name?: string;
  phone?: string;
  investmentCapacity?: number;
  riskPreference?: 'low' | 'medium' | 'high';
  address?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
}
