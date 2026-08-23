import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import { rethrowFirebaseError } from '../../common/firebase-error';
import { User, UserRole, UserStatus } from './interfaces/user.interface';
import { QueryUsersDto } from './dto/query-users.dto';
import { AdminQueryCacheService } from '../../common/cache/admin-query-cache.service';
import { normalizeSearchToken } from '../../common/firestore/search-tokens';
import { writeAuditLog } from '../../common/audit/write-audit-log';
import { ChatGateway } from '../chat/gateway/chat.gateway';

@Injectable()
export class AdminService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;

  constructor(
    private readonly firebaseService: FirebaseService,
    @Optional()
    private readonly cache: AdminQueryCacheService = new AdminQueryCacheService(),
    @Optional() private readonly gateway?: ChatGateway,
  ) {}

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
    if (data.accountStatus === 'suspended') return 'suspended';
    if (data.accountStatus === 'pending') return 'pending';
    if (data.accountStatus === 'active') return 'active';
    if (data.status === 'inactive') {
      return 'suspended';
    }

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
      role: this.getPrimaryRole(
        sanitizedData.primaryRole ?? sanitizedData.roles ?? sanitizedData.role,
      ),
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

  // Collects the core user counts used across admin summaries.
  private async getUserCounts() {
    const usersCollection = this.db.collection('users');

    const [
      totalUsers,
      pendingUsers,
      suspendedUsers,
      admins,
      borrowers,
      lenders,
    ] = await Promise.all([
      this.getCount(usersCollection),
      this.getCount(usersCollection.where('accountStatus', '==', 'pending')),
      this.getCount(usersCollection.where('accountStatus', '==', 'suspended')),
      this.getCount(usersCollection.where('roles', 'array-contains', 'admin')),
      this.getCount(
        usersCollection.where('roles', 'array-contains', 'borrower'),
      ),
      this.getCount(usersCollection.where('roles', 'array-contains', 'lender')),
    ]);

    return {
      totalUsers,
      pendingUsers,
      suspendedUsers,
      admins,
      borrowers,
      lenders,
    };
  }

  // Returns all users after removing sensitive fields and applying optional filters.
  async getAllUsers(
    query: QueryUsersDto = {},
    limit?: string,
    cursor?: string,
  ) {
    try {
      const pageSize = this.parseLimit(limit);
      let usersQuery: FirebaseFirestore.Query = this.db.collection('users');
      if (query.role)
        usersQuery = usersQuery.where('primaryRole', '==', query.role);
      if (query.status)
        usersQuery = usersQuery.where('accountStatus', '==', query.status);
      const search = normalizeSearchToken(query.search);
      if (search)
        usersQuery = usersQuery.where('searchTokens', 'array-contains', search);
      usersQuery = usersQuery.orderBy('createdAt', 'desc');

      if (cursor) {
        const cursorDoc = await this.getUserDocument(cursor).get();
        if (cursorDoc.exists) {
          usersQuery = usersQuery.startAfter(cursorDoc);
        }
      }

      const usersSnapshot = await usersQuery.limit(pageSize + 1).get();
      const hasMore = usersSnapshot.size > pageSize;
      const pageDocs = usersSnapshot.docs.slice(0, pageSize);
      const users = pageDocs.map((doc) =>
        this.sanitizeUser(doc.id, doc.data()),
      );
      const nextCursor = hasMore
        ? pageDocs[pageDocs.length - 1]?.id
        : undefined;

      return {
        success: true,
        count: users.length,
        users,
        hasMore,
        nextCursor,
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
      const cached = await this.cache.remember('admin:users:stats', () =>
        this.getUserCounts(),
      );
      const {
        totalUsers,
        pendingUsers,
        suspendedUsers,
        admins,
        borrowers,
        lenders,
      } = cached.value;

      const activeUsers = Math.max(
        totalUsers - pendingUsers - suspendedUsers,
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
        generatedAt: cached.generatedAt,
        cacheAgeSeconds: cached.cacheAgeSeconds,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      rethrowFirebaseError(error, 'Failed to fetch user stats');
    }
  }

  // Suspends the selected user and persists the audit-related metadata.
  async suspendUser(userId: string, reason?: string, actorAdminId = 'system') {
    try {
      const userRef = this.getUserDocument(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new NotFoundException('User not found');
      }

      await userRef.update({
        status: 'suspended',
        accountStatus: 'suspended',
        suspendedAt: FieldValue.serverTimestamp(),
        suspensionReason: reason || 'No reason provided',
        updatedAt: FieldValue.serverTimestamp(),
      });
      this.cache.invalidate('admin:users:');
      await writeAuditLog(this.db, {
        actorUserId: actorAdminId,
        action: 'user.suspended',
        entityType: 'user',
        entityId: userId,
        before: { accountStatus: userDoc.data()?.accountStatus },
        after: { accountStatus: 'suspended' },
        metadata: { reason: reason || 'No reason provided' },
      });
      this.gateway?.emitToRole('admin', 'admin:changed', {
        resource: 'users',
        entityId: userId,
        changeType: 'suspended',
        updatedAt: new Date().toISOString(),
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
  async activateUser(userId: string, actorAdminId = 'system') {
    try {
      const userRef = this.getUserDocument(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new NotFoundException('User not found');
      }

      await userRef.update({
        status: 'active',
        accountStatus: 'active',
        activatedAt: FieldValue.serverTimestamp(),
        suspendedAt: FieldValue.delete(),
        suspensionReason: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      this.cache.invalidate('admin:users:');
      await writeAuditLog(this.db, {
        actorUserId: actorAdminId,
        action: 'user.activated',
        entityType: 'user',
        entityId: userId,
        before: { accountStatus: userDoc.data()?.accountStatus },
        after: { accountStatus: 'active' },
      });
      this.gateway?.emitToRole('admin', 'admin:changed', {
        resource: 'users',
        entityId: userId,
        changeType: 'activated',
        updatedAt: new Date().toISOString(),
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
  async deleteUser(userId: string, actorAdminId = 'system') {
    try {
      const userRef = this.getUserDocument(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new NotFoundException('User not found');
      }

      await userRef.delete();
      this.cache.invalidate('admin:users:');
      await writeAuditLog(this.db, {
        actorUserId: actorAdminId,
        action: 'user.deleted',
        entityType: 'user',
        entityId: userId,
        before: { accountStatus: userDoc.data()?.accountStatus },
      });
      this.gateway?.emitToRole('admin', 'admin:changed', {
        resource: 'users',
        entityId: userId,
        changeType: 'deleted',
        updatedAt: new Date().toISOString(),
      });

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
