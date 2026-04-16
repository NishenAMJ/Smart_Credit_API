import { DashboardService, Borrower } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getDashboardMetrics(): Promise<{
        totalBorrowers: number;
        todaysCollection: number;
        overduePayments: number;
        activeAds: number;
    }>;
    getRecentBorrowers(limit?: string): Promise<Borrower[]>;
    getUserProfile(uid: string): Promise<void>;
}
