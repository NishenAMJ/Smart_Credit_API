import { Injectable, NotFoundException } from '@nestjs/common';

export interface Application {
  id: string;
  borrower: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
}

@Injectable()
export class LenderApplicationsService {
  private applications: Application[] = [
    { id: '1', borrower: 'John Doe', amount: 1000, status: 'pending' },
    { id: '2', borrower: 'Jane Smith', amount: 2000, status: 'approved' },
    { id: '3', borrower: 'Alice', amount: 1500, status: 'pending' },
    { id: '4', borrower: 'Bob', amount: 1200, status: 'rejected', reason: 'Low credit score' },
  ];

  getAllApplications() {
    return this.applications;
  }
  // This method returns only the applications that are currently pending, which is typically what a lender would want to review and take action on.

  getPendingApplications() {
    return this.applications.filter(app => app.status === 'pending');
  }

  getApplicationById(id: string) {
    return this.applications.find(app => app.id === id);
  }

  approveApplication(id: string) {
    const app = this.getApplicationById(id);
    if (!app) throw new NotFoundException('Application not found');
    app.status = 'approved';
    delete app.reason;
    return { success: true, message: 'Application approved', application: app };
  }
  // This method changes the status of the specified application to "approved". It also removes any existing reason for rejection, as the application is now approved.

  rejectApplication(id: string, reason: string) {
    const app = this.getApplicationById(id);
    if (!app) throw new NotFoundException('Application not found');
    app.status = 'rejected';
    app.reason = reason || 'No reason provided';
    return { success: true, message: 'Application rejected', application: app };
  }
}
