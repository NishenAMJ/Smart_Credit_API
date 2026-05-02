import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from '../../firebase/firebase.service';
import { rethrowFirebaseError } from '../../common/firebase-error';
import { User, UserRole, UserStatus } from './interfaces/user.interface';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserDocument, AccountStatus } from '../auth/auth.types';

@Injectable()
export class AdminService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 50;

  constructor(private readonly firebaseService: FirebaseService) {}

  private get db() {
    return this.firebaseService.db;
  }

  private getPrimaryRole(role: unknown): UserRole | null {
    if (Array.isArray(role)) {
      const firstRole = role[0];
      return typeof firstRole === 'string'
        ? (firstRole as UserRole)
        : null;
    }
    return typeof role === 'string' ? (role as UserRole) : null;
  }

  private getDerivedStatus(user: any): UserStatus {
    if (user.accountStatus === 'suspended' || user.status === 'suspended') {
      return 'suspended';
    }
    if (user.kycStatus === 'pending') {
      return 'pending';
    }
    return 'active';
  }

  private sanitizeUser(id: string, data: any): User {
    const {
      passwordHash,
      emailLower,
      phoneNormalized,
      ...sanitizedData
    } = data;

    const storedUid = sanitizedData.uid || id;
    const storedFullName = sanitizedData.fullName || 'Unnamed User';
    const storedFirstName = sanitizedData.firstName;
    const storedLastName = sanitizedData.lastName;

    const [firstName, ...rest] = storedFullName.split(' ');
    const lastName = rest.join(' ');

    return {
      id,
      uid: storedUid,
      role: this.getPrimaryRole(sanitizedData.role) || 'borrower',
      status: this.getDerivedStatus(sanitizedData),
      fullName: storedFullName,
      firstName: storedFirstName ?? firstName,
      lastName: storedLastName ?? lastName,
      ...sanitizedData,
    } as User;
  }

  private getUserDocument(userId: string) {
    return this.db.collection('users').doc(userId);
  }

  private matchesUserFilters(user: User, query: QueryUsersDto): boolean {
    const normalizedSearch = query.search?.trim().toLowerCase();
    const primaryRole = this.getPrimaryRole(user.role);

    if (query.role && primaryRole !== query.role) {
      return false;
    }

    if (query.status && user.status !== query.status) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const searchableValues = [
      user.email,
      user.id,
      primaryRole,
      user.status,
      user.fullName,
      user.phone,
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    return searchableValues.some((value) => value.includes(normalizedSearch));
  }

  private parseLimit(limit?: string | number) {
    const parsed = Number(limit ?? AdminService.DEFAULT_PAGE_SIZE);
    if (!Number.isFinite(parsed)) {
      return AdminService.DEFAULT_PAGE_SIZE;
    }

    return Math.min(
      Math.max(Math.trunc(parsed), 1),
      AdminService.MAX_PAGE_SIZE,
    );
  }

  async getUsers(params: QueryUsersDto) {
    try {
      const pageSize = this.parseLimit(params.limit);
      let usersQuery: FirebaseFirestore.Query = this.db
        .collection('users')
        .orderBy('createdAt', 'desc');

      if (params.cursor) {
        const cursorDoc = await this.getUserDocument(params.cursor).get();
        if (cursorDoc.exists) {
          usersQuery = usersQuery.startAfter(cursorDoc);
        }
      }

      const users: User[] = [];
      let nextCursor: string | undefined;
      let exhausted = false;
      let queryCursorDoc:
        | FirebaseFirestore.QueryDocumentSnapshot
        | undefined;

      while (users.length < pageSize && !exhausted) {
        let pageQuery = usersQuery.limit(Math.max(pageSize * 2, pageSize + 1));
        if (queryCursorDoc) {
          pageQuery = usersQuery.startAfter(queryCursorDoc).limit(
            Math.max(pageSize * 2, pageSize + 1),
          );
        }

        const usersSnapshot = await pageQuery.get();

        if (usersSnapshot.empty) {
          exhausted = true;
          break;
        }

        queryCursorDoc = usersSnapshot.docs[usersSnapshot.docs.length - 1];

        usersSnapshot.docs.forEach((doc) => {
          if (users.length >= pageSize) {
            return;
          }

          const user = this.sanitizeUser(doc.id, doc.data());
          if (this.matchesUserFilters(user, params)) {
            users.push(user);
            nextCursor = doc.id;
          }
        });

        if (usersSnapshot.size < Math.max(pageSize * 2, pageSize + 1)) {
          exhausted = true;
        }
      }

      return {
        success: true,
        count: users.length,
        users,
        hasMore: !exhausted && Boolean(nextCursor),
        nextCursor: !exhausted ? nextCursor : undefined,
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      rethrowFirebaseError(error, 'Failed to fetch users');
    }
  }

  async getUserById(userId: string) {
    try {
      const userDoc = await this.getUserDocument(userId).get();

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
      rethrowFirebaseError(error, 'Failed to fetch user');
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
        const user = doc.data() as any;
        const primaryRole = this.getPrimaryRole(user.role);
        const status = this.getDerivedStatus(user);

        if (status === 'active') stats.activeUsers++;
        if (status === 'suspended') stats.suspendedUsers++;
        if (status === 'pending') stats.pendingUsers++;

        if (primaryRole === 'admin') stats.admins++;
        if (primaryRole === 'borrower') stats.borrowers++;
        if (primaryRole === 'lender') stats.lenders++;
      });

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      rethrowFirebaseError(error, 'Failed to fetch user stats');
    }
  }

  async suspendUser(userId: string, reason?: string) {
    try {
      const userRef = this.getUserDocument(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new NotFoundException('User not found');
      }

      await userRef.update({
        accountStatus: 'suspended',
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
      const userRef = this.getUserDocument(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new NotFoundException('User not found');
      }

      await userRef.update({
        accountStatus: 'active',
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
      const userRef = this.getUserDocument(userId);
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

  // Preserve existing KYC and Transaction methods
  async getPendingKyc(params: { limit?: number; cursor?: string }) {
    const { limit = 10, cursor } = params;
    let query = this.db
      .collection('kyc_submissions')
      .where('status', '==', 'pending')
      .limit(limit);

    if (cursor) {
      const cursorDoc = await this.db.collection('kyc_submissions').doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      count: documents.length,
      documents,
      hasMore: snapshot.docs.length === limit,
      nextCursor: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null,
    };
  }

  async updateKycStatus(
    submissionId: string,
    updateDto: { status: string; reviewNotes?: string },
    reviewedBy: string,
  ) {
    try {
      const submissionRef = this.db.collection('kyc_submissions').doc(submissionId);
      const submissionDoc = await submissionRef.get();

      if (!submissionDoc.exists) {
        throw new NotFoundException('KYC submission not found');
      }

      const submission = submissionDoc.data() as any;
      const now = admin.firestore.FieldValue.serverTimestamp();

      await submissionRef.update({
        status: updateDto.status,
        reviewNotes: updateDto.reviewNotes,
        reviewedAt: now,
        reviewedBy,
      });

      // Also update the user document's kycStatus to keep them in sync
      if (submission.userId) {
        await this.db.collection('users').doc(submission.userId).update({
          kycStatus: updateDto.status,
          updatedAt: now,
        });
      }

      return {
        success: true,
        message: `KYC submission ${updateDto.status} successfully`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error updating KYC status:', error);
      throw new InternalServerErrorException('Failed to update KYC status');
    }
  }
}
