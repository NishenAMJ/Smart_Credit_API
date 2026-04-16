"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const firebase_service_1 = require("../firebase/firebase.service");
let DashboardService = class DashboardService {
    firebaseService;
    db;
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
        this.db = this.firebaseService.getDb();
    }
    async getUserProfile(uid) {
        const userDoc = await this.db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            throw new Error(`User with UID ${uid} not found`);
        }
        return {
            ...userDoc.data(),
            uid: userDoc.id,
        };
    }
    async getDashboardMetrics() {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const borrowersCount = await this.db
            .collection('users')
            .where('role', '==', 'borrower')
            .count()
            .get();
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
        }
        catch (e) {
            console.warn('Today collection query failed (maybe index needed):', e);
            todaysCollection = 0;
        }
        let overduePayments = 0;
        try {
            const overdueQuery = this.db
                .collectionGroup('installments')
                .where('status', '==', 'pending')
                .where('dueDate', '<', now.toISOString());
            const overdueSnapshot = await overdueQuery.count().get();
            overduePayments = overdueSnapshot.data().count;
        }
        catch (e) {
            console.warn('Overdue query failed (index missing?):', e);
        }
        const activeAds = 0;
        return {
            totalBorrowers: borrowersCount.data().count,
            todaysCollection,
            overduePayments,
            activeAds,
        };
    }
    async getRecentBorrowers(limit = 50) {
        const snapshot = await this.db
            .collection('users')
            .where('role', '==', 'borrower')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
        const borrowers = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            borrowers.push({
                id: doc.id,
                name: data.fullName || 'Unknown',
                email: data.email || '',
                phone: data.phone,
                creditScore: data.creditScore || Math.floor(Math.random() * 200) + 600,
                status: data.isVerified ? 'verified' : 'pending',
                totalBorrowed: data.totalBorrowed || 0,
                joinedDate: data.createdAt,
            });
        });
        return borrowers;
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map