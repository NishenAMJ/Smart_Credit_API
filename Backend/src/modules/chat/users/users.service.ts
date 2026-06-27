/**
 * users.service.ts — FIELD INSPECTION VERSION
 *
 * The previous log showed: 60 docs in "users" collection → 0 match "fathima"
 * This means either:
 *   A) Fathima is NOT in the "users" collection at all (wrong collection name)
 *   B) Fathima IS in "users" but her name is stored under a different field
 *      e.g. "fullName", "name", "firstName"+"lastName" instead of "displayName"
 *
 * This version logs:
 *   1. The actual field names on the first 3 docs (so we see the real schema)
 *   2. Searches across ALL possible name field combinations
 *   3. Also queries the "borrowers" collection in case it exists separately
 */
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { COLLECTIONS, UserDoc } from '../common/types';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private firebase: FirebaseService) { }

  async findById(userId: string): Promise<UserDoc> {
    const snap = await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get();
    if (!snap.exists) throw new NotFoundException('User not found');
    return { id: snap.id, ...snap.data() } as UserDoc;
  }

  async search(
    query: string,
    requesterId: string,
  ): Promise<Omit<UserDoc, 'fcmToken'>[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    //  Query users collection 
    const usersSnap = await this.firebase
      .collection(COLLECTIONS.USERS) // "users"
      .limit(200)
      .get();

    this.logger.log(`[search] "users" collection: ${usersSnap.size} docs`);

    // Log the ACTUAL field names of first 3 docs so we see the real schema
    usersSnap.docs.slice(0, 3).forEach((d) => {
      const data = d.data();
      this.logger.log(
        `[schema] id="${d.id}" fields=${JSON.stringify(Object.keys(data))} ` +
        `displayName="${data.displayName}" name="${data.name}" ` +
        `fullName="${data.fullName}" firstName="${data.firstName}"`,
      );
    });

    //  Also query "borrowers" collection 
    // In case borrowers are stored separately from lenders
    const borrowersSnap = await this.firebase.db
      .collection('borrowers')
      .limit(200)
      .get();

    this.logger.log(
      `[search] "borrowers" collection: ${borrowersSnap.size} docs`,
    );

    if (borrowersSnap.size > 0) {
      borrowersSnap.docs.slice(0, 3).forEach((d) => {
        const data = d.data();
        this.logger.log(
          `[borrower schema] id="${d.id}" fields=${JSON.stringify(Object.keys(data))} ` +
          `displayName="${data.displayName}" name="${data.name}" ` +
          `fullName="${data.fullName}" firstName="${data.firstName}"`,
        );
      });
    }

    //  Merge both collections
    const allDocs = [...usersSnap.docs, ...borrowersSnap.docs];

    const results = allDocs
      .map((d) => {
        const data = d.data() as any;
        const { fcmToken, password, ...safe } = data;
        return { ...safe, id: d.id };
      })
      .filter((u) => {
        if (u.id === requesterId) return false;

        // Check EVERY possible field name a name could be stored under
        const candidates = [
          u.displayName,
          u.name,
          u.fullName,
          u.firstName,
          u.lastName,
          u.username,
          u.email,
          // Combined first+last in case stored separately
          u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : null,
        ]
          .filter(Boolean)
          .map((v: any) => String(v).toLowerCase());

        return candidates.some((c) => c.includes(q));
      });

    //  Map to consistent shape 
    // Normalize whatever field name is used into displayName + username
    const normalized = results.map((u: any) => ({
      ...u,
      displayName:
        u.displayName ??
        u.name ??
        u.fullName ??
        (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.id),
      username: u.username ?? u.email ?? u.id,
    }));

    this.logger.log(`[search] query="${q}" → ${normalized.length} results`);
    return normalized;
  }

  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({ fcmToken });
  }

  async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({
        isOnline,
        lastSeen: isOnline ? null : this.firebase.serverTimestamp(),
      });
  }

  async getFcmToken(userId: string): Promise<string | null> {
    const snap = await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get();
    return (snap.data() as UserDoc)?.fcmToken ?? null;
  }
}
