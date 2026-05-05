import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { Dispute } from './interfaces/dispute.interface';

@Injectable()
export class DisputesService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 50;

  constructor(private readonly firebaseService: FirebaseService) {}

  // Keep the page size within a safe range.
  private parseLimit(limit?: string) {
    const parsed = Number(limit ?? DisputesService.DEFAULT_PAGE_SIZE);
    if (!Number.isFinite(parsed)) {
      return DisputesService.DEFAULT_PAGE_SIZE;
    }

    return Math.min(
      Math.max(Math.trunc(parsed), 1),
      DisputesService.MAX_PAGE_SIZE,
    );
  }

  // Return a paginated list of all disputes for admins.
  async getAllDisputes(
    limit?: string,
    cursor?: string,
  ): Promise<{
    success: boolean;
    count: number;
    disputes: Dispute[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    try {
      const db = this.firebaseService.db;
      const pageSize = this.parseLimit(limit);
      let disputesRef: FirebaseFirestore.Query = db
        .collection('disputes')
        .orderBy('createdAt', 'desc');

      if (cursor) {
        const cursorDoc = await db.collection('disputes').doc(cursor).get();
        if (cursorDoc.exists) {
          disputesRef = disputesRef.startAfter(cursorDoc);
        }
      }

      const snapshot = await disputesRef.limit(pageSize + 1).get();
      const pageDocs = snapshot.docs.slice(0, pageSize);

      const disputes: Dispute[] = [];
      pageDocs.forEach((doc) => {
        disputes.push({
          id: doc.id,
          ...doc.data(),
        } as Dispute);
      });

      return {
        success: true,
        count: disputes.length,
        disputes,
        hasMore: snapshot.size > pageSize,
        nextCursor:
          snapshot.size > pageSize
            ? pageDocs[pageDocs.length - 1]?.id
            : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to fetch disputes: ${error.message}`);
    }
  }

  // Return one dispute record by id.
  async getDisputeById(disputeId: string): Promise<Dispute> {
    try {
      const db = this.firebaseService.db;
      const disputeDoc = await db.collection('disputes').doc(disputeId).get();

      if (!disputeDoc.exists) {
        throw new NotFoundException('Dispute not found');
      }

      return {
        id: disputeDoc.id,
        ...disputeDoc.data(),
      } as Dispute;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to fetch dispute: ${error.message}`);
    }
  }

  // Mark a dispute as resolved and save the resolution note.
  async resolveDispute(
    disputeId: string,
    resolution: string,
    notes?: string,
  ): Promise<{ success: boolean; message: string; disputeId: string }> {
    try {
      const db = this.firebaseService.db;
      const disputeRef = db.collection('disputes').doc(disputeId);
      const disputeDoc = await disputeRef.get();

      if (!disputeDoc.exists) {
        throw new NotFoundException('Dispute not found');
      }

      const updateData: any = {
        status: 'resolved',
        resolution,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      };

      if (notes) {
        updateData.notes = notes;
      }

      await disputeRef.update(updateData);

      return {
        success: true,
        message: 'Dispute resolved successfully',
        disputeId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to resolve dispute: ${error.message}`);
    }
  }

  // Mark a dispute as escalated and save the escalation reason.
  async escalateDispute(
    disputeId: string,
    reason: string,
    notes?: string,
  ): Promise<{ success: boolean; message: string; disputeId: string }> {
    try {
      const db = this.firebaseService.db;
      const disputeRef = db.collection('disputes').doc(disputeId);
      const disputeDoc = await disputeRef.get();

      if (!disputeDoc.exists) {
        throw new NotFoundException('Dispute not found');
      }

      const updateData: any = {
        status: 'escalated',
        escalationReason: reason,
        escalatedAt: new Date(),
        updatedAt: new Date(),
      };

      if (notes) {
        updateData.notes = notes;
      }

      await disputeRef.update(updateData);

      return {
        success: true,
        message: 'Dispute escalated successfully',
        disputeId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to escalate dispute: ${error.message}`);
    }
  }
}
