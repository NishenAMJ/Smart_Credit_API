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

@Injectable()
export class AdminService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;

  constructor(private readonly firebaseService: FirebaseService) {}

  private get db() {
    return this.firebaseService.db;
  }

  private getPrimaryRole(role?: User['role']): UserRole {
    if (Array.isArray(role)) {
      return role[0] ?? 'borrower';
    }

    return role ?? 'borrower';
  }

  private getDerivedStatus(data: FirebaseFirestore.DocumentData): UserStatus {
    if (data.status) {
      return data.status as UserStatus;
    }

    if (data.kycStatus === 'pending') {
      return 'pending';
    }

    return 'active';
  }

  private splitName(fullName?: string) {
    if (!fullName) {
      return { firstName: undefined, lastName: undefined };
    }

    const [firstName, ...rest] = fullName.split(' ');
    return {
      firstName,
      lastName: rest.join(' ') || undefined,
    };
  }

  // Removes sensitive fields before user records are returned to the client.
  private sanitizeUser(id: string, data: FirebaseFirestore.DocumentData): User {
    const sanitizedData = { ...data } as Partial<User> &
      Record<string, unknown>;
    delete sanitizedData.passwordHash;

    const storedFullName =
      typeof sanitizedData.fullName === 'string'
        ? sanitizedData.fullName
        : undefined;
    const storedFirstName =
      typeof sanitizedData.firstName === 'string'
        ? sanitizedData.firstName
        : undefined;
    const storedLastName =
      typeof sanitizedData.lastName === 'string'
        ? sanitizedData.lastName
        : undefined;
    const storedUid =
      typeof sanitizedData.uid === 'string' ? sanitizedData.uid : id;
    const { firstName, lastName } = this.splitName(storedFullName);

    return {
      id,
      uid: storedUid,
      role: this.getPrimaryRole(sanitizedData.role),
      status: this.getDerivedStatus(sanitizedData),
      fullName: storedFullName,
      firstName: storedFirstName ?? firstName,
      lastName: storedLastName ?? lastName,
      ...sanitizedData,
    } as User;
  }

  // Returns a Firestore document reference for a user id.
  private getUserDocument(userId: string) {
    return this.db.collection('users').doc(userId);
  }

  // Checks whether a user matches the requested admin-side filters.
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

  private parseLimit(limit?: string) {
    const parsed = Number(limit ?? AdminService.DEFAULT_PAGE_SIZE);
    if (!Number.isFinite(parsed)) {
      return AdminService.DEFAULT_PAGE_SIZE;
    }

    return Math.min(
      Math.max(Math.trunc(parsed), 1),
      AdminService.MAX_PAGE_SIZE,
    );
  }

  private async getCount(query: FirebaseFirestore.Query): Promise<number> {
    const snapshot = await query.count().get();
    return snapshot.data().count;
  }

  // Returns all users after removing sensitive fields and applying optional filters.
  async getAllUsers(
    query: QueryUsersDto = {},
    limit?: string,
    cursor?: string,
  ) {
    try {
      const pageSize = this.parseLimit(limit);
      let usersQuery: FirebaseFirestore.Query = this.db
        .collection('users')
        .orderBy('createdAt', 'desc');

      if (cursor) {
        const cursorDoc = await this.getUserDocument(cursor).get();
        if (cursorDoc.exists) {
          usersQuery = usersQuery.startAfter(cursorDoc);
        }
      }

      const users: User[] = [];
      let nextCursor: string | undefined;
      let exhausted = false;
      let queryCursorDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

      while (users.length < pageSize && !exhausted) {
        let pageQuery = usersQuery.limit(Math.max(pageSize * 2, pageSize + 1));
        if (queryCursorDoc) {
          pageQuery = usersQuery
            .startAfter(queryCursorDoc)
            .limit(Math.max(pageSize * 2, pageSize + 1));
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
          if (this.matchesUserFilters(user, query)) {
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

  // Returns a single sanitized user record for the requested id.
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

  // Aggregates user counts by status and role for admin reporting.
  async getUserStats() {
    try {
      const usersCollection = this.db.collection('users');
      const [
        totalUsers,
        pendingUsers,
        suspendedUsers,
        inactiveUsers,
        admins,
        borrowers,
        lenders,
      ] = await Promise.all([
        this.getCount(usersCollection),
        this.getCount(
          usersCollection.where('accountStatus', '==', 'pending'),
        ),
        this.getCount(usersCollection.where('status', '==', 'suspended')),
        this.getCount(usersCollection.where('status', '==', 'inactive')),
        this.getCount(usersCollection.where('role', 'array-contains', 'admin')),
        this.getCount(
          usersCollection.where('role', 'array-contains', 'borrower'),
        ),
        this.getCount(usersCollection.where('role', 'array-contains', 'lender')),
      ]);

      const activeUsers = Math.max(
        totalUsers - pendingUsers - suspendedUsers - inactiveUsers,
        0,
      );

      const stats = {
        totalUsers,
        activeUsers,
        suspendedUsers,
        pendingUsers,
        admins,
        borrowers,
        lenders,
      };

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      rethrowFirebaseError(error, 'Failed to fetch user stats');
    }
  }

  // Suspends the selected user and persists the audit-related metadata.
  async suspendUser(userId: string, reason?: string) {
    try {
      const userRef = this.getUserDocument(userId);
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

  // Restores a suspended user to the active state and clears suspension metadata.
  async activateUser(userId: string) {
    try {
      const userRef = this.getUserDocument(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new NotFoundException('User not found');
      }

      await userRef.update({
        status: 'active',
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

  // Deletes a user document after confirming that it exists.
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
}
