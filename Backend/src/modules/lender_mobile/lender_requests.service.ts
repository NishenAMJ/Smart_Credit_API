import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class LenderRequestsService {
  private readonly logger = new Logger(LenderRequestsService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Approve a loan request.
   * Updates the 'loanRequests' Firestore document status to 'approved'.
   */
  async approveRequest(
    lenderId: string,
    requestId: string,
    notes?: string,
  ): Promise<{ requestId: string; status: string; updatedAt: string }> {
    this.logger.log(`Lender ${lenderId} approving request ${requestId}`);

    const ref = this.firebaseService.db.collection('loanRequests').doc(requestId);
    const doc = await ref.get();

    if (!doc.exists) {
      throw new NotFoundException(`Loan request ${requestId} not found`);
    }

    const updatedAt = new Date().toISOString();
    await ref.update({
      status: 'approved',
      approvedByLenderId: lenderId,
      approvedAt: updatedAt,
      updatedAt,
      ...(notes ? { lenderNotes: notes } : {}),
    });

    this.logger.debug(`Request ${requestId} approved by lender ${lenderId}`);
    return { requestId, status: 'approved', updatedAt };
  }

  /**
   * Reject a loan request.
   * Updates the 'loanRequests' Firestore document status to 'rejected'.
   */
  async rejectRequest(
    lenderId: string,
    requestId: string,
    reason: string,
  ): Promise<{ requestId: string; status: string; updatedAt: string }> {
    this.logger.log(`Lender ${lenderId} rejecting request ${requestId}`);

    const ref = this.firebaseService.db.collection('loanRequests').doc(requestId);
    const doc = await ref.get();

    if (!doc.exists) {
      throw new NotFoundException(`Loan request ${requestId} not found`);
    }

    const updatedAt = new Date().toISOString();
    await ref.update({
      status: 'rejected',
      rejectedByLenderId: lenderId,
      rejectionReason: reason || 'No reason provided',
      rejectedAt: updatedAt,
      updatedAt,
    });

    this.logger.debug(`Request ${requestId} rejected by lender ${lenderId}`);
    return { requestId, status: 'rejected', updatedAt };
  }
}
