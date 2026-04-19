import { FirebaseService } from '../firebase/firebase.service';
import { BorrowerDetailsResponse, DashboardOverviewResponse } from './dashboard.types';
export declare class DashboardService {
    private readonly firebaseService;
    private readonly logger;
    private readonly warnedFallbacks;
    constructor(firebaseService: FirebaseService);
    getOverview(limit?: number): Promise<DashboardOverviewResponse>;
    getBorrowerDetails(borrowerId: string): Promise<BorrowerDetailsResponse | null>;
    private clamp;
    private getBorrowerCount;
    private getActiveAdsCount;
    private getOverduePaymentsCount;
    private getTodaysCollection;
    private getCurrentDayRange;
    private getRecentBorrowers;
    private getCountWithFallback;
    private logFallback;
    private getFirestoreErrorCode;
    private countOverdueInstallmentsByLoans;
    private sumRepaymentTransactions;
    private mapBorrower;
    private toIsoString;
    private toDate;
}
