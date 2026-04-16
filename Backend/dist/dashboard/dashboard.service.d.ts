import { FirebaseService } from '../firebase/firebase.service';
export interface Borrower {
    id: string;
    name: string;
    email: string;
    phone?: string;
    creditScore?: number;
    status: string;
    totalBorrowed?: number;
    joinedDate?: string;
}
export declare class DashboardService {
    private firebaseService;
    private db;
    constructor(firebaseService: FirebaseService);
    getUserProfile(uid: string): Promise<{
        uid: string;
    }>;
    getDashboardMetrics(): Promise<{
        totalBorrowers: number;
        todaysCollection: number;
        overduePayments: number;
        activeAds: number;
    }>;
    getRecentBorrowers(limit?: number): Promise<Borrower[]>;
}
