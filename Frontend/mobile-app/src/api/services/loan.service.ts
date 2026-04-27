/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";
import { titleCase } from "../normalizers";
import { getUserId } from "../../utils/auth.storage";
import type { BorrowerLoan, LoanStatus } from "../../types/borrower";

const FALLBACK_LENDER_NAME = "Lender";
const ACTIVE_LOAN_STATUS: LoanStatus = "active";

type LoanListResponse = {
  success?: boolean;
  data?: BorrowerLoan[];
};

function normalizeLoan(loan: Partial<BorrowerLoan>): BorrowerLoan {
  return {
    ...loan,
    loanId: String(loan.loanId ?? ""),
    lenderName:
      loan.lenderName ??
      titleCase(String(loan.lenderId ?? FALLBACK_LENDER_NAME)),
    minAmount: loan.minAmount ?? loan.loanAmount,
    maxAmount: loan.maxAmount ?? loan.loanAmount,
    durationMonths: loan.durationMonths ?? loan.loanTermMonths,
    amount: loan.amount ?? loan.loanAmount,
    isFeatured: loan.isFeatured ?? loan.status === ACTIVE_LOAN_STATUS,
  };
}

export const loanService = {
  getMyLoans: async (status?: LoanStatus) => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.get<LoanListResponse>(
      ENDPOINTS.loans.list,
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
        ? response.data.data.map(normalizeLoan)
        : [],
    };
  },

  getFeaturedLoans: async () => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.get<LoanListResponse>(
      ENDPOINTS.loans.featured,
      {
        params: { borrowerId },
      },
    );
    return {
      ...response.data,
      data: Array.isArray(response.data?.data)
        ? response.data.data.map(normalizeLoan)
        : [],
    };
  },

  searchLoans: async (keyword: string) => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.get<LoanListResponse>(
      ENDPOINTS.loans.search,
      {
        params: { borrowerId, keyword },
      },
    );
    return {
      ...response.data,
      data: Array.isArray(response.data?.data)
        ? response.data.data.map(normalizeLoan)
        : [],
    };
  },

  getLoanById: async (loanId: string) => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.get<{
      success?: boolean;
      data?: BorrowerLoan;
    }>(ENDPOINTS.loans.byId(loanId), {
      params: { borrowerId },
    });
    return {
      ...response.data,
      data: normalizeLoan(response.data?.data ?? {}),
    };
  },
};
export async function getFeaturedLoans() {
  const response = await loanService.getFeaturedLoans();
  return response?.data ?? [];
}

export async function getMyLoans(status?: LoanStatus) {
  const response = await loanService.getMyLoans(status);
  return response?.data ?? [];
}

export async function searchLoans(keyword: string) {
  const response = await loanService.searchLoans(keyword);
  return response?.data ?? [];
}
