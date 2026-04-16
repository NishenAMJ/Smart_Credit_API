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
var DashboardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const firestore_1 = require("firebase-admin/firestore");
const firebase_service_1 = require("../firebase/firebase.service");
function isDashboardBorrower(borrower) {
    return borrower !== null;
}
let DashboardService = DashboardService_1 = class DashboardService {
    firebaseService;
    logger = new common_1.Logger(DashboardService_1.name);
    warnedFallbacks = new Set();
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
    }
    async getOverview(limit = 24) {
        const db = this.firebaseService.getDb();
        const safeLimit = this.clamp(limit, 8, 50);
        const [totalBorrowers, todaysCollection, overduePayments, activeAds, recentBorrowers,] = await Promise.all([
            this.getBorrowerCount(db),
            this.getTodaysCollection(db),
            this.getOverduePaymentsCount(db),
            this.getActiveAdsCount(db),
            this.getRecentBorrowers(db, safeLimit),
        ]);
        return {
            summary: {
                totalBorrowers,
                todaysCollection,
                overduePayments,
                activeAds,
            },
            recentBorrowers,
            generatedAt: new Date().toISOString(),
        };
    }
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    async getBorrowerCount(db) {
        const query = db.collection('users').where('role', '==', 'borrower');
        return this.getCountWithFallback('borrower count', query, async () => (await query.get()).size);
    }
    async getActiveAdsCount(db) {
        const query = db.collection('lenderAds').where('status', '==', 'approved');
        return this.getCountWithFallback('active ads count', query, async () => (await query.get()).size);
    }
    async getOverduePaymentsCount(db) {
        const query = db
            .collectionGroup('installments')
            .where('status', '==', 'overdue');
        return this.getCountWithFallback('overdue payments count', query, async () => this.countOverdueInstallmentsByLoans(db));
    }
    async getTodaysCollection(db) {
        const { start, end } = this.getCurrentDayRange();
        const query = db
            .collection('transactions')
            .where('createdAt', '>=', firestore_1.Timestamp.fromDate(start))
            .where('createdAt', '<', firestore_1.Timestamp.fromDate(end));
        try {
            const snapshot = await query.get();
            return this.sumRepaymentTransactions(snapshot.docs);
        }
        catch (error) {
            this.logFallback('todaysCollection', 'Falling back to an unfiltered transactions scan for todays collection.', error);
            const snapshot = await db.collection('transactions').get();
            return this.sumRepaymentTransactions(snapshot.docs, { start, end });
        }
    }
    getCurrentDayRange() {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start, end };
    }
    async getRecentBorrowers(db, limit) {
        const fetchSize = Math.max(limit * 5, 50);
        try {
            const snapshot = await db
                .collection('users')
                .orderBy('createdAt', 'desc')
                .limit(fetchSize)
                .get();
            return snapshot.docs
                .map((doc) => this.mapBorrower(doc))
                .filter(isDashboardBorrower)
                .slice(0, limit);
        }
        catch (error) {
            this.logFallback('recentBorrowers', 'Falling back to an unordered borrower query for dashboard overview.', error);
            const snapshot = await db.collection('users').limit(fetchSize).get();
            return snapshot.docs
                .map((doc) => this.mapBorrower(doc))
                .filter(isDashboardBorrower)
                .sort((left, right) => {
                const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
                const rightTime = right.createdAt
                    ? new Date(right.createdAt).getTime()
                    : 0;
                return rightTime - leftTime;
            })
                .slice(0, limit);
        }
    }
    async getCountWithFallback(label, query, fallback) {
        try {
            const snapshot = await query.count().get();
            return snapshot.data().count;
        }
        catch (error) {
            this.logFallback(`aggregate:${label}`, `Falling back from aggregate query for ${label}.`, error);
            return fallback();
        }
    }
    logFallback(key, message, error) {
        if (this.warnedFallbacks.has(key)) {
            return;
        }
        this.warnedFallbacks.add(key);
        const errorCode = this.getFirestoreErrorCode(error);
        const suffix = errorCode ? ` Firestore code: ${errorCode}.` : '';
        this.logger.warn(`${message}${suffix}`);
    }
    getFirestoreErrorCode(error) {
        if (typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (typeof error.code === 'number' || typeof error.code === 'string')) {
            return String(error.code);
        }
        return null;
    }
    async countOverdueInstallmentsByLoans(db) {
        const loansSnapshot = await db.collection('loans').get();
        const counts = await Promise.all(loansSnapshot.docs.map(async (loanDoc) => {
            const installmentsSnapshot = await loanDoc.ref
                .collection('installments')
                .where('status', '==', 'overdue')
                .get();
            return installmentsSnapshot.size;
        }));
        return counts.reduce((total, count) => total + count, 0);
    }
    sumRepaymentTransactions(docs, dateRange) {
        return docs.reduce((total, doc) => {
            const data = doc.data();
            const amount = typeof data.amount === 'number' && Number.isFinite(data.amount)
                ? data.amount
                : 0;
            if (data.type !== 'repayment') {
                return total;
            }
            if (!dateRange) {
                return total + amount;
            }
            const createdAt = this.toDate(data.createdAt);
            if (!createdAt) {
                return total;
            }
            return createdAt >= dateRange.start && createdAt < dateRange.end
                ? total + amount
                : total;
        }, 0);
    }
    mapBorrower(doc) {
        const data = doc.data();
        if (data.role !== 'borrower') {
            return null;
        }
        return {
            id: doc.id,
            fullName: typeof data.fullName === 'string' && data.fullName.trim().length > 0
                ? data.fullName
                : 'Unnamed borrower',
            email: typeof data.email === 'string' ? data.email : 'No email',
            creditScore: typeof data.creditScore === 'number' && Number.isFinite(data.creditScore)
                ? data.creditScore
                : null,
            kycStatus: typeof data.kycStatus === 'string' ? data.kycStatus : 'not_submitted',
            activeLoansCount: typeof data.activeLoansCount === 'number' &&
                Number.isFinite(data.activeLoansCount)
                ? data.activeLoansCount
                : 0,
            isActive: data.isActive !== false,
            createdAt: this.toIsoString(data.createdAt),
        };
    }
    toIsoString(value) {
        const asDate = this.toDate(value);
        return asDate ? asDate.toISOString() : null;
    }
    toDate(value) {
        if (value instanceof firestore_1.Timestamp) {
            return value.toDate();
        }
        if (value instanceof Date) {
            return value;
        }
        if (typeof value === 'string' && value.trim().length > 0) {
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
        return null;
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = DashboardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map