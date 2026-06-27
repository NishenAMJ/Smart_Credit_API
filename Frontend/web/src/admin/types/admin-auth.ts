export interface AdminAuthResponse {
  accessToken: string;
  user: {
    uid: string;
    email: string;
    fullName: string;
    phone: string;
    role: "admin" | "borrower" | "lender";
    kycStatus:
      | "not_submitted"
      | "pending"
      | "under_review"
      | "approved"
      | "rejected";
  };
}
