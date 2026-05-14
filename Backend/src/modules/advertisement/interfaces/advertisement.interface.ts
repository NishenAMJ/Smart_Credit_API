import {Timestamp}from 'firebase-admin/firestore';

export type AdStatus = 'active' | 'paused' | 'expired' | 'pending';

export interface Advertisement{
  adId: string;
  lenderId: string;

  // Lender info (denormalized for fast reads)
  lenderName: string;
  lenderPhotoURL: string;
  lenderRating: number;

  // Ad content
  title: string;
  description: string;
  imageUrl: string;

  // Loan terms
  minAmount: number;
  maxAmount: number;
  preferredInterestRate: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  preferredPurposes: string[];
  availableCapital: number;
  responseTimeHours: number;

  // Location and search
  location: string;
  searchKeywords: string[];

  // Status
  status: AdStatus;

  // Boost info
  isBoosted: boolean;
  boostExpiry: Timestamp | null;
  boostPaidAt: Timestamp | null;
  boostAmount: number;

  // Analytics
  views: number;
  clicks: number;
  applicationCount: number;
  fundedLoansCount: number;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;

  // Seed tracking
  source?: string;
  seedBatchId?: string;
}


export interface AdvertisementResponse{
  adId: string;
  lenderId: string;
  lenderName: string;
  lenderPhotoURL: string;
  lenderRating: number;
  title: string;
  description: string;
  imageUrl: string;
  minAmount: number;
  maxAmount: number;
  preferredInterestRate: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  preferredPurposes: string[];
  availableCapital: number;
  responseTimeHours: number;
  location: string;
  searchKeywords: string[];
  status: AdStatus;
  isBoosted: boolean;
  boostExpiry: string | null;
  boostAmount: number;
  views: number;
  clicks: number;
  applicationCount: number;
  fundedLoansCount: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}
