import {
  fetchLenderApi,
  fetchLenderApiWithQuery,
  parseApiError,
} from "./api-client";

export type RecentTransactionsSummary = {
  totalTransactions: number;
  totalCollected: number;
  loansWithActivity: number;
  overdueInstallments: number;
};

export type CursorPageInfo = {
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type RecentTransactionItem = {
  transactionId: string;
  loanId: string;
  installmentId: string | null;
  borrowerId: string;
  borrowerName: string;
  borrowerEmail: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string | null;
  loanStatus: string;
  remainingAmount: number;
  source: "payment" | "transaction";
  installmentSummary: {
    totalInstallments: number;
    paidInstallments: number;
    overdueInstallments: number;
    nextDueDate: string | null;
    latestInstallmentStatus: string;
  };
};

export type RecentTransactionsResponse = {
  lenderId: string;
  summary: RecentTransactionsSummary;
  searchResultCount: number | null;
  transactions: RecentTransactionItem[];
  pageInfo: CursorPageInfo;
  generatedAt: string;
};

export type LoanLedgerPaymentDetail = {
  id: string;
  amount: number;
  status: string;
  type: string;
  createdAt: string | null;
  source: "payment" | "transaction";
  note: string | null;
};

export type LoanLedgerInstallmentDetail = {
  id: string;
  status: string;
  dueDate: string | null;
  amount: number;
  paidAmount: number;
  payments: LoanLedgerPaymentDetail[];
};

export type LoanLedgerDetailsResponse = {
  lenderId: string;
  loan: {
    id: string;
    borrowerId: string | null;
    status: string;
    amount: number;
    remainingAmount: number;
    interestRate: number;
    tenureMonths: number;
    createdAt: string | null;
  };
  installments: LoanLedgerInstallmentDetail[];
};

export type RecordInstallmentPaymentInput = {
  amount: number;
  paidAt?: string | null;
  note?: string | null;
};

export type FetchRecentTransactionsOptions = {
  pageSize?: number;
  cursor?: string | null;
  includeSummary?: boolean;
  includeSearchCount?: boolean;
  search?: string | null;
};

export async function fetchRecentTransactions(
  options: FetchRecentTransactionsOptions = {},
): Promise<RecentTransactionsResponse> {
  const params = new URLSearchParams({
    pageSize: String(options.pageSize ?? 15),
  });

  if (options.cursor) {
    params.set("cursor", options.cursor);
  }

  if (options.includeSummary === false) {
    params.set("includeSummary", "false");
  }

  if (options.includeSearchCount === false) {
    params.set("includeSearchCount", "false");
  }

  if (options.search && options.search.trim().length > 0) {
    params.set("search", options.search.trim());
  }

  const response = await fetchLenderApiWithQuery("/recent-transactions", params);

  if (!response.ok) {
    return parseApiError(response, "Failed to load recent transactions.");
  }

  return response.json();
}

export async function fetchLoanLedgerDetails(
  loanId: string,
): Promise<LoanLedgerDetailsResponse> {
  const response = await fetchLenderApi(
    `/recent-transactions/loans/${encodeURIComponent(loanId)}`,
  );

  if (!response.ok) {
    return parseApiError(response, "Failed to load loan ledger details.");
  }

  return response.json();
}

export async function recordInstallmentPayment(
  loanId: string,
  installmentId: string,
  input: RecordInstallmentPaymentInput,
): Promise<LoanLedgerDetailsResponse> {
  const response = await fetchLenderApi(
    `/recent-transactions/loans/${encodeURIComponent(
      loanId,
    )}/installments/${encodeURIComponent(installmentId)}/payments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    return parseApiError(response, "Failed to record installment payment.");
  }

  return response.json();
}
