// Users service handles all user-related operations in the chat system
// Includes fetching users, searching, updating FCM tokens, and presence status

import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { COLLECTIONS, UserDoc } from '../common/types';

@Injectable()
export class UsersService {
  constructor(private firebase: FirebaseService) {}

  
  // GET SINGLE USER
  
  async findById(userId: string): Promise<UserDoc> {
    // Fetch user document from Firestore
    const snap = await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get();

    // If user doesn't exist → throw error
    if (!snap.exists)
      throw new NotFoundException('User not found');

    // Return user data with ID included
    return { id: snap.id, ...snap.data() } as UserDoc;
  }

  
  // SEARCH USERS (username / displayName)
  
  // Note: Firestore doesn't support full-text search
  // This uses prefix matching (basic search)
  

  async search(
    query: string,
    requesterId: string,
  ): Promise<Omit<UserDoc, 'fcmToken'>[]> {
    const q = query.toLowerCase().trim();

    // If empty query → return empty list
    if (!q) return [];

    // Prefix search on username field
    const snap = await this.firebase
      .collection(COLLECTIONS.USERS)
      .orderBy('username')
      .startAt(q)
      .endAt(q + '\uf8ff')
      .limit(20)
      .get();

    // Remove sensitive field (fcmToken) before sending to client
    return snap.docs
      .map((d) => {
        const data = d.data() as UserDoc;
        const { fcmToken, ...safe } = data;

        return { ...safe, id: d.id };
      })

      // Exclude current user from search results
      .filter((u) => u.id !== requesterId);
  }

  
  // UPDATE FCM TOKEN
 
  async updateFcmToken(
    userId: string,
    fcmToken: string,
  ): Promise<void> {
    // Update user's push notification token
    await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({ fcmToken });
  }

  
  // ONLINE / OFFLINE STATUS
  
  async setOnlineStatus(
    userId: string,
    isOnline: boolean,
  ): Promise<void> {
    await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({
        isOnline,

        // If offline → store last seen timestamp
        // If online → clear lastSeen
        lastSeen: isOnline
          ? null
          : this.firebase.serverTimestamp(),
      });
  }

  
  // GET FCM TOKEN (INTERNAL USE ONLY)
 
  async getFcmToken(userId: string): Promise<string | null> {
    const snap = await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get();

    return (snap.data() as UserDoc)?.fcmToken ?? null;
  }
}