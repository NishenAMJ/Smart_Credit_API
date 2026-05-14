export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    profileId?: string; // lender or borrower profile ID
  };
}
