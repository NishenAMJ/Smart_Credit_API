export class RegisterDto {
  email: string;
  password: string;
  role: 'lender' | 'borrower' | 'admin';
  name: string;
  phone: string;
}
