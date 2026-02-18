import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { User } from './interfaces/user.interface';

@Injectable()
export class AdminService {
  private db = admin.firestore();

  async getAllUsers() {
    try {
      const usersSnapshot = await this.db.collection('users').get();
      const users = usersSnapshot.docs.map((doc) => {
        const data = doc.data() as any;
        // Exclude sensitive fields like passwordHash
        const { passwordHash, ...sanitizedData } = data;
        return {
          id: doc.id,
          ...sanitizedData,
        } as User;
      });

      return {
        success: true,
        count: users.length,
        users,
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  async getUserById(userId: string) {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        throw new NotFoundException('User not found');
      }

      const data = userDoc.data() as any;
      // Exclude sensitive fields like passwordHash
      const { passwordHash, ...sanitizedData } = data;

      return {
        success: true,
        user: {
          id: userDoc.id,
          ...sanitizedData,
        } as User,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error fetching user:', error);
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  async suspendUser(userId: string, reason?: string) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new NotFoundException('User not found');
      }

      await userRef.update({
        status: 'suspended',
        suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
        suspensionReason: reason || 'No reason provided',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        message: 'User suspended successfully',
        userId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error suspending user:', error);
      throw new InternalServerErrorException('Failed to suspend user');
    }
  }

  async activateUser(userId: string) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new NotFoundException('User not found');
      }

      await userRef.update({
        status: 'active',
        suspendedAt: admin.firestore.FieldValue.delete(),
        suspensionReason: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        message: 'User activated successfully',
        userId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error activating user:', error);
      throw new InternalServerErrorException('Failed to activate user');
    }
  }

  async deleteUser(userId: string) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new NotFoundException('User not found');
      }

      await userRef.delete();

      return {
        success: true,
        message: 'User deleted successfully',
        userId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error deleting user:', error);
      throw new InternalServerErrorException('Failed to delete user');
    }
  }
}
