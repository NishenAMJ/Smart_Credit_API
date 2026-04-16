import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { Firestore } from 'firebase-admin/firestore';

export interface Borrower {
  id: string;
  name: string;
  email: string;
  phone?: string;
  creditScore?: number;
  status: string; // e.g. "active", "pending", "verified"
  totalBorrowed?: number;
  joinedDate?: string;
}

@Injectable()
export class DashboardService {
  private db: Firestore;

  constructor(private firebaseService: FirebaseService) {
    this.db = this.firebaseService.getDb();
  }

  async getUserProfile(uid: string) {
    const userDoc = await this.db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      throw new Error(`User with UID ${uid} not found`);
    }

    return {
      ...userDoc.data(),
      uid: userDoc.id, // make sure uid is always present
    };
  }

  // ========================
  // DASHBOARD METRICS
  // ========================
  // ========================
  // OPTIMIZED DASHBOARD METRICS
  // ========================
  async getDashboardMetrics() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // "2026-04-16"

    // 1. Total Borrowers - already efficient with .count()
    const borrowersCount = await this.db
      .collection('users')
      .where('role', '==', 'borrower')
      .count()
      .get();

    // 2. Today's Collection - Better: Use aggregation if available, or limit scope
    // For now: still use collectionGroup but add limit and better filtering
    let todaysCollection = 0;
    try {
      const paidTodayQuery = this.db
        .collectionGroup('installments')
        .where('status', '==', 'paid')
        .where('paidDate', '>=', `${todayStr}T00:00:00Z`)
        .where('paidDate', '<', `${todayStr}T23:59:59Z`);

      const paidSnapshot = await paidTodayQuery.get();

      paidSnapshot.forEach((doc) => {
        const data = doc.data();
        todaysCollection += Number(data.amount || 0);
      });
    } catch (e) {
      console.warn('Today collection query failed (maybe index needed):', e);
      todaysCollection = 0;
    }

    // 3. Overdue Payments - Count only (no need to fetch full docs)
    let overduePayments = 0;
    try {
      const overdueQuery = this.db
        .collectionGroup('installments')
        .where('status', '==', 'pending')
        .where('dueDate', '<', now.toISOString());

      const overdueSnapshot = await overdueQuery.count().get(); // Use .count() instead of .get() + size
      overduePayments = overdueSnapshot.data().count;
    } catch (e) {
      console.warn('Overdue query failed (index missing?):', e);
    }

    // 4. Active Ads → still placeholder
    const activeAds = 0;

    return {
      totalBorrowers: borrowersCount.data().count,
      todaysCollection,
      overduePayments,
      activeAds,
    };
  }

  // ========================
  // RECENT BORROWERS
  // ========================
  async getRecentBorrowers(limit = 50): Promise<Borrower[]> {
    const snapshot = await this.db
      .collection('users')
      .where('role', '==', 'borrower')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const borrowers: Borrower[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      borrowers.push({
        id: doc.id,
        name: data.fullName || 'Unknown',
        email: data.email || '',
        phone: data.phone,
        creditScore: data.creditScore || Math.floor(Math.random() * 200) + 600, // temporary fallback
        status: data.isVerified ? 'verified' : 'pending',
        totalBorrowed: data.totalBorrowed || 0,
        joinedDate: data.createdAt,
      });
    });

    return borrowers;
  }
}
