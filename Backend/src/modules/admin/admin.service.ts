import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from '../../firebase/firebase.service';
import { User } from './interfaces/user.interface';
import { QueryUsersDto } from './dto/query-users.dto';

@Injectable()
export class AdminService {
  constructor(private readonly firebaseService: FirebaseService) {}

  private get db() {
    return this.firebaseService.db;
  }

  private sanitizeUser(
    id: string,
    data: FirebaseFirestore.DocumentData,
  ): User {
    const { passwordHash, ...sanitizedData } = data;

    return {
      id,
      ...sanitizedData,
    } as User;
  }

  async getAllUsers(query: QueryUsersDto = {}) {
    try {
      const usersSnapshot = await this.db.collection('users').get();
      const normalizedSearch = query.search?.trim().toLowerCase();

      const users = usersSnapshot.docs
        .map((doc) => this.sanitizeUser(doc.id, doc.data()))
        .filter((user) => {
          if (query.role && user.role !== query.role) {
            return false;
          }

          if (query.status && user.status !== query.status) {
            return false;
          }

          if (normalizedSearch) {
            const searchableValues = [
              user.email,
              user.id,
              user.role,
              user.status,
            ]
              .filter(Boolean)
              .map((value) => String(value).toLowerCase());

            return searchableValues.some((value) =>
              value.includes(normalizedSearch),
            );
          }

          return true;
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

      return {
        success: true,
        user: this.sanitizeUser(userDoc.id, userDoc.data() ?? {}),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error fetching user:', error);
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  async getUserStats() {
    try {
      const usersSnapshot = await this.db.collection('users').get();

      const stats = {
        totalUsers: usersSnapshot.size,
        activeUsers: 0,
        suspendedUsers: 0,
        pendingUsers: 0,
        admins: 0,
        borrowers: 0,
        lenders: 0,
      };

      usersSnapshot.forEach((doc) => {
        const user = doc.data() as User;

        if (user.status === 'active') stats.activeUsers++;
        if (user.status === 'suspended') stats.suspendedUsers++;
        if (user.status === 'pending') stats.pendingUsers++;

        if (user.role === 'admin') stats.admins++;
        if (user.role === 'borrower') stats.borrowers++;
        if (user.role === 'lender') stats.lenders++;
      });

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw new InternalServerErrorException('Failed to fetch user stats');
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
