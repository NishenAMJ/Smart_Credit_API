export interface AdminAuthResponse {
  accessToken: string;
  user: {
    uid: string;
    email: string;
    role: "admin" | "borrower" | "lender";
  };
}
