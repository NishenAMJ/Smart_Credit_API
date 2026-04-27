import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { CreateLenderDto } from './dto/create-lender.dto';
import { UpdateLenderDto } from './dto/update-lender.dto';
import { CreateLoanOfferDto } from './dto/create-loan-offer.dto';
import { UpdateLoanOfferDto } from './dto/update-loan-offer.dto';
import {
  LenderResponseDto,
  LoanOfferResponseDto,
  DashboardStatsDto,
} from './dto/lender-response.dto';

@Injectable()
export class LenderService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async createLender(createLenderDto: CreateLenderDto): Promise<LenderResponseDto> {
    const lenderData = {
      ...createLenderDto,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await this.firebaseService.db
      .collection('lenders')
      .add(lenderData);

    return {
      id: docRef.id,
      ...lenderData,
    };
  }

  async findLenderById(id: string): Promise<LenderResponseDto> {
    const doc = await this.firebaseService.db
      .collection('lenders')
      .doc(id)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Lender with ID ${id} not found`);
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as LenderResponseDto;
  }

  async updateLender(
    id: string,
    updateLenderDto: UpdateLenderDto,
  ): Promise<LenderResponseDto> {
    const lenderRef = this.firebaseService.db.collection('lenders').doc(id);
    const doc = await lenderRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Lender with ID ${id} not found`);
    }

    const updateData = {
      ...updateLenderDto,
      updatedAt: new Date(),
    };

    await lenderRef.update(updateData);

    const updatedDoc = await lenderRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as LenderResponseDto;
  }

  async getAllLenders(): Promise<LenderResponseDto[]> {
    const snapshot = await this.firebaseService.db
      .collection('lenders')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as LenderResponseDto[];
  }

  async createLoanOffer(
    createLoanOfferDto: CreateLoanOfferDto,
  ): Promise<LoanOfferResponseDto> {
    // Verify lender exists
    const lenderDoc = await this.firebaseService.db
      .collection('lenders')
      .doc(createLoanOfferDto.lenderId)
      .get();

    if (!lenderDoc.exists) {
      throw new NotFoundException(
        `Lender with ID ${createLoanOfferDto.lenderId} not found`,
      );
    }

    const offerData = {
      ...createLoanOfferDto,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await this.firebaseService.db
      .collection('loanOffers')
      .add(offerData);

    return {
      id: docRef.id,
      ...offerData,
    };
  }

  async getLoanOffersByLender(lenderId: string): Promise<LoanOfferResponseDto[]> {
    const snapshot = await this.firebaseService.db
      .collection('loanOffers')
      .where('lenderId', '==', lenderId)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as LoanOfferResponseDto[];
  }

  async getLoanOfferById(offerId: string): Promise<LoanOfferResponseDto> {
    const doc = await this.firebaseService.db
      .collection('loanOffers')
      .doc(offerId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Loan offer with ID ${offerId} not found`);
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as LoanOfferResponseDto;
  }

  async updateLoanOffer(
    offerId: string,
    updateLoanOfferDto: UpdateLoanOfferDto,
  ): Promise<LoanOfferResponseDto> {
    const offerRef = this.firebaseService.db.collection('loanOffers').doc(offerId);
    const doc = await offerRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Loan offer with ID ${offerId} not found`);
    }

    const updateData = {
      ...updateLoanOfferDto,
      updatedAt: new Date(),
    };

    await offerRef.update(updateData);

    const updatedDoc = await offerRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as LoanOfferResponseDto;
  }

  async getDashboardStats(lenderId: string): Promise<DashboardStatsDto> {
    // Verify lender exists
    const lenderDoc = await this.firebaseService.db
      .collection('lenders')
      .doc(lenderId)
      .get();

    if (!lenderDoc.exists) {
      throw new NotFoundException(`Lender with ID ${lenderId} not found`);
    }

    // Get all loan offers by this lender
    const offersSnapshot = await this.firebaseService.db
      .collection('loanOffers')
      .where('lenderId', '==', lenderId)
      .get();

    let totalActiveOffers = 0;
    let totalAmountOffered = 0;

    offersSnapshot.docs.forEach((doc) => {
      const offer = doc.data();
      if (offer.status === 'active') {
        totalActiveOffers++;
        totalAmountOffered += offer.amount || 0;
      }
    });

    // For now, return mock data for loans (can be implemented later)
    return {
      totalActiveOffers,
      totalAmountOffered,
      totalLoansIssued: 0, // To be implemented when loans module is ready
      totalReturns: 0, // To be calculated from repayments
      activeLoansCount: 0, // To be queried from loans collection
    };
  }
}
