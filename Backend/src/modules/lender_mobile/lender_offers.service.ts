import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

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

  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Create a new loan offer for this lender.
   * Writes to the 'loanOffers' Firestore collection.
   */
  async createOffer(
    lenderId: string,
    input: Record<string, any>,
  ): Promise<LoanOffer> {
    this.logger.log(`Creating loan offer for lender ${lenderId}`);

    const now = new Date().toISOString();
    const offerData = {
      lenderId,
      loanType: input.loanType,
      minAmount: Number(input.minAmount) || 0,
      maxAmount: Number(input.maxAmount) || 0,
      interestRate: Number(input.interestRate) || 0,
      tenureMonths: Number(input.tenureMonths) || 12,
      active: input.active !== false,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firebaseService.db
      .collection('loanOffers')
      .add(offerData);

    this.logger.debug(`Created offer ${docRef.id} for lender ${lenderId}`);

    return { id: docRef.id, ...offerData };
  }

  /**
   * Update an existing loan offer (must belong to this lender).
   * PATCH on the 'loanOffers' collection doc.
   */
  async updateOffer(
    lenderId: string,
    offerId: string,
    input: Record<string, any>,
  ): Promise<LoanOffer> {
    this.logger.log(`Updating offer ${offerId} for lender ${lenderId}`);

    const offerRef = this.firebaseService.db
      .collection('loanOffers')
      .doc(offerId);
    const doc = await offerRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Offer ${offerId} not found`);
    }

    const existingData = doc.data();
    if (existingData?.lenderId !== lenderId) {
      throw new ForbiddenException('You can only update your own offers');
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (input.minAmount !== undefined)
      updateData.minAmount = Number(input.minAmount);
    if (input.maxAmount !== undefined)
      updateData.maxAmount = Number(input.maxAmount);
    if (input.interestRate !== undefined)
      updateData.interestRate = Number(input.interestRate);
    if (input.tenureMonths !== undefined)
      updateData.tenureMonths = Number(input.tenureMonths);
    if (input.active !== undefined) updateData.active = input.active;

    await offerRef.update(updateData);

    const updated = await offerRef.get();
    const data = updated.data()!;

    return {
      id: updated.id,
      lenderId: data.lenderId,
      loanType: data.loanType,
      minAmount: data.minAmount,
      maxAmount: data.maxAmount,
      interestRate: data.interestRate,
      tenureMonths: data.tenureMonths,
      active: data.active,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
