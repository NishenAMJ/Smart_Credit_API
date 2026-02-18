import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { Dispute } from './interfaces/dispute.interface';

@Injectable()
export class DisputesService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getAllDisputes(): Promise<{ success: boolean; count: number; disputes: Dispute[] }> {
    try {
      const db = this.firebaseService.db;
      const disputesRef = db.collection('disputes');
      
      const snapshot = await disputesRef.get();

      const disputes: Dispute[] = [];
      snapshot.forEach((doc) => {
        disputes.push({
          id: doc.id,
          ...doc.data(),
        } as Dispute);
      });

      return {
        success: true,
        count: disputes.length,
        disputes,
      };
    } catch (error) {
      throw new Error(`Failed to fetch disputes: ${error.message}`);
    }
  }

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
