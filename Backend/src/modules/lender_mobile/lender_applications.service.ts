import { Injectable, NotFoundException } from '@nestjs/common';

export interface ApplicationDecision {
  success: boolean;
  message: string;
  application: Application;
}

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
    {
      id: '4',
      borrower: 'Bob',
      amount: 1200,
      status: 'rejected',
      reason: 'Low credit score',
    },
  ];

  /**
   * Returns every lender application shown in the mobile dashboard.
   */
  getAllApplications(): Application[] {
    return this.applications;
  }

  /**
   * Filters the dashboard list to applications waiting for review.
   */
  getPendingApplications(): Application[] {
    return this.applications.filter((application) => {
      return application.status === 'pending';
    });
  }

  getApplicationById(id: string): Application | undefined {
    return this.applications.find((application) => application.id === id);
  }

  approveApplication(id: string): ApplicationDecision {
    const application = this.getApplicationById(id);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    application.status = 'approved';
    delete application.reason;

    return {
      success: true,
      message: 'Application approved',
      application,
    };
  }

  rejectApplication(id: string, reason: string): ApplicationDecision {
    const application = this.getApplicationById(id);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    application.status = 'rejected';
    application.reason = reason || 'No reason provided';

    return {
      success: true,
      message: 'Application rejected',
      application,
    };
  }
}
