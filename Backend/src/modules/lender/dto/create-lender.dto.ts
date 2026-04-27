export class CreateLenderDto {
  name: string;
  email: string;
  phone: string;
  investmentCapacity: number;
  riskPreference: 'low' | 'medium' | 'high';
  address?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
}
