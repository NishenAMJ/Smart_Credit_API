import { Injectable, Logger } from '@nestjs/common';
import { LenderAdsService } from '../lender/lender-ads/lender-ads.service';

export interface LoanOffer {
  id: string;
  lenderId: string;
  loanType: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  tenureMonths: number;
  active: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfferInput {
  loanType: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  tenureMonths: number;
  active?: boolean;
}

export interface UpdateOfferInput {
  minAmount?: number;
  maxAmount?: number;
  interestRate?: number;
  tenureMonths?: number;
  active?: boolean;
}

@Injectable()
export class LenderOffersService {
  private readonly logger = new Logger(LenderOffersService.name);

  constructor(private readonly lenderAdsService: LenderAdsService) {}

  async createOffer(
    lenderId: string,
    input: Record<string, any>,
  ): Promise<LoanOffer> {
    this.logger.log(`Creating lender ad for mobile lender ${lenderId}`);
    const loanType = String(input.loanType ?? 'Personal').trim() || 'Personal';
    const ad = await this.lenderAdsService.createAd({
      lenderId,
      lenderName: null,
      headline: `${loanType} financing offer`,
      minAmount: Number(input.minAmount) || 0,
      maxAmount: Number(input.maxAmount) || 0,
      interestRate: Number(input.interestRate) || 0,
      tenureMonths: Number(input.tenureMonths) || 12,
      borrowerFocus: `${loanType} borrowers`,
      processingTime: 'Reviewed within 24 hours',
      repaymentStyle: 'Monthly installments',
      requirements: 'Approved KYC and verified income documents',
      supportNote: 'Contact the lender through Smart Credit support',
    });

    return this.toMobileOffer(ad, loanType);
  }

  async updateOffer(
    lenderId: string,
    offerId: string,
    input: Record<string, any>,
  ): Promise<LoanOffer> {
    this.logger.log(`Updating lender ad ${offerId} from lender mobile`);
    const ad = await this.lenderAdsService.updateAdFromMobile(
      lenderId,
      offerId,
      input,
    );
    return this.toMobileOffer(ad, ad.preferredPurposes[0] ?? 'Personal');
  }

  private toMobileOffer(
    ad: Awaited<ReturnType<LenderAdsService['updateAdFromMobile']>>,
    loanType: string,
  ): LoanOffer {
    return {
      id: ad.id,
      lenderId: ad.lenderId,
      loanType,
      minAmount: ad.minAmount,
      maxAmount: ad.maxAmount,
      interestRate: ad.preferredInterestRate,
      tenureMonths: ad.maxTenureMonths,
      active: ad.status === 'active',
      status: ad.status,
      createdAt: ad.createdAt ?? '',
      updatedAt: ad.updatedAt ?? '',
    };
  }
}
