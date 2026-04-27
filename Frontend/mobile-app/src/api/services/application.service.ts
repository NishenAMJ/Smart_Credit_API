/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";
import { toIsoDate, titleCase } from "../normalizers";
import { getUserId } from "../../utils/auth.storage";
import type {
  ApplicationStatus,
  BorrowerApplication,
} from "../../types/borrower";

type LoanApplicationStatus = ApplicationStatus;
type ApplicationListResponse = {
  success?: boolean;
  data?: BorrowerApplication[];
};

export interface CreateApplicationPayload {
  loanId?: string;
  requestedAmount: number;
  purpose: string;
  description?: string;
  loanTermMonths?: number;
  preferredRepaymentMethod?: "bank_transfer" | "qr_payment" | "cash";
  collateralDetails?: string[];
  additionalNotes?: string;
}

function normalizeApplication(
  application: Partial<BorrowerApplication> & {
    loanAmount?: number;
    loanPurpose?: string;
    purposeDescription?: string;
  },
): BorrowerApplication {
  return {
    ...application,
    createdAt: toIsoDate(application.createdAt),
    updatedAt: toIsoDate(application.updatedAt),
    loanTitle: `${titleCase(application.loanPurpose)} Loan`,
    requestedAmount: application.loanAmount,
    purpose:
      application.purposeDescription ?? titleCase(application.loanPurpose),
  };
}

export const applicationService = {
  getMyApplications: async (status?: LoanApplicationStatus) => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.get<ApplicationListResponse>(
      ENDPOINTS.applications.list,
      {
        params: {
          borrowerId,
          ...(status ? { status } : {}),
        },
      },
    );
    return {
      ...response.data,
      data: Array.isArray(response.data?.data)
        ? response.data.data.map(normalizeApplication)
        : [],
    };
  },

  getApplicationById: async (applicationId: string) => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.get<{
      success?: boolean;
      data?: BorrowerApplication;
    }>(ENDPOINTS.applications.byId(applicationId), { params: { borrowerId } });
    return {
      ...response.data,
      data: normalizeApplication(response.data?.data ?? {}),
    };
  },

  createApplication: async (data: CreateApplicationPayload) => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.post<{
      success?: boolean;
      data?: BorrowerApplication;
    }>(
      ENDPOINTS.applications.create,
      { ...data, borrowerId },
      { params: { borrowerId } },
    );
    return {
      ...response.data,
      data: normalizeApplication(response.data?.data ?? {}),
    };
  },

  updateApplication: async (
    applicationId: string,
    data: Partial<CreateApplicationPayload>,
  ) => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.put<{
      success?: boolean;
      data?: BorrowerApplication;
    }>(ENDPOINTS.applications.update(applicationId), data, {
      params: { borrowerId },
    });
    return {
      ...response.data,
      data: normalizeApplication(response.data?.data ?? {}),
    };
  },

  submitApplication: async (applicationId: string) => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.post<{
      success?: boolean;
      data?: BorrowerApplication;
    }>(
      ENDPOINTS.applications.submit(applicationId),
      {},
      { params: { borrowerId } },
    );
    return {
      ...response.data,
      data: normalizeApplication(response.data?.data ?? {}),
    };
  },

  deleteApplication: async (applicationId: string) => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.delete(
      ENDPOINTS.applications.delete(applicationId),
      { params: { borrowerId } },
    );
    return response.data;
  },
};
export async function createApplication(payload: {
  loanId: string;
  requestedAmount: number;
  purpose: string;
  description?: string;
  loanTermMonths?: number;
  preferredRepaymentMethod?: "bank_transfer" | "qr_payment" | "cash";
}) {
  return applicationService.createApplication({
    loanId: payload.loanId,
    requestedAmount: payload.requestedAmount,
    purpose: payload.purpose,
    description: payload.description,
    loanTermMonths: payload.loanTermMonths,
    preferredRepaymentMethod: payload.preferredRepaymentMethod,
  });
}
