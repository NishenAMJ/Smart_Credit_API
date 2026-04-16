import { DashboardService } from './dashboard.service';
import { DashboardOverviewResponse } from './dashboard.types';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getOverview(limit: number): Promise<DashboardOverviewResponse>;
}
