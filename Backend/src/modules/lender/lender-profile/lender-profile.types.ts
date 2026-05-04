export interface LenderProfileResponse {
  id: string;
  lenderId: string;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  businessName: string | null;
  businessRegistrationNo: string | null;
  kycStatus: string;
  responseTimeHours: number;
  preferredRegions: string[];
  availableCapital: number;
  rating: number | null;
  profilePhotoUrl: string | null;
  updatedAt: string | null;
  totalLoaned: number;
  totalReturned: number;
  totalLoansCompleted: number;
}

export interface UpdateLenderProfileInput {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  businessName: string;
  responseTimeHours: number;
  preferredRegions: string[];
}
