export interface User {
  id: string;
  email: string;
  role: string;
  status?: string;
  createdAt?: any;
  updatedAt?: any;
  suspendedAt?: any;
  suspensionReason?: string;
}
