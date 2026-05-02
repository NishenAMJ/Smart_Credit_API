/** @format */

export const ENDPOINTS = {
  SEARCH_LOANS: "/api/borrower/loans/search",
  FEATURED_LOANS: "/api/borrower/loans/featured",
  LOAN_DETAILS: (loanId: string) => `/api/borrower/loans/${loanId}`,
  FILTER_LOANS: "/api/borrower/loans/filter",
  MY_APPLICATIONS: "/api/borrower/applications",
  APPLICATION_DETAILS: (applicationId: string) =>
    `/api/borrower/applications/${applicationId}`,
  CREATE_APPLICATION: "/api/borrower/applications",
  UPDATE_APPLICATION: (applicationId: string) =>
    `/api/borrower/applications/${applicationId}`,
  DELETE_APPLICATION: (applicationId: string) =>
    `/api/borrower/applications/${applicationId}`,
  MY_PAYMENTS: "/api/borrower/payments",
  CREATE_PAYMENT: "/api/borrower/payments",
  GENERATE_QR: "/api/borrower/payments/generate-qr",
  UPLOAD_RECEIPT: "/api/borrower/payments/upload-receipt",
  MY_TRANSACTIONS: "/api/borrower/transactions",
  TRANSACTION_DETAILS: (transactionId: string) =>
    `/api/borrower/transactions/${transactionId}`,
  CREDIT_SCORE: "/api/borrower/credit-score",
  CREDIT_SCORE_HISTORY: "/api/borrower/credit-score/history",
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    me: "/api/auth/me",
    session: "/api/auth/session",
    borrowerDashboard: "/api/auth/borrower/dashboard",
    lenderDashboard: "/api/auth/lender/dashboard",
  },
  kyc: {
    submit: "/api/kyc/submit",
    mySubmission: "/api/kyc/my-submission",
  },
  legal: {
    generate: (loanId: string) => `/api/legal/documents/generate/${loanId}`,
    latestByLoan: (loanId: string) => `/api/legal/documents/loan/${loanId}/latest`,
    accept: (documentId: string) => `/api/legal/documents/${documentId}/accept`,
    download: (documentId: string) => `/api/legal/documents/${documentId}/download`,
  },
  loans: {
    featured: "/api/borrower/loans/featured",
    search: "/api/borrower/loans/search",
    list: "/api/borrower/loans",
    byId: (loanId: string) => `/api/borrower/loans/${loanId}`,
    filter: "/api/borrower/loans/filter",
  },
  dashboard: {
    borrower: (borrowerId: string) => `/api/borrower/dashboard/${borrowerId}`,
    get: (borrowerId: string) => `/api/borrower/dashboard/${borrowerId}`,
  },
  support: {
    status: "/api/borrower/support/status",
  },
  profile: {
    get: (userId: string) => `/api/borrower/profile/${userId}`,
    update: (userId: string) => `/api/borrower/profile/${userId}`,
  },
  applications: {
    list: "/api/borrower/applications",
    create: "/api/borrower/applications",
    byId: (id: string) => `/api/borrower/applications/${id}`,
    update: (id: string) => `/api/borrower/applications/${id}`,
    submit: (id: string) => `/api/borrower/applications/${id}/submit`,
    delete: (id: string) => `/api/borrower/applications/${id}`,
  },
  repayments: {
    list: "/api/borrower/payments",
    make: "/api/borrower/payments",
    generateQr: "/api/borrower/payments/generate-qr",
    verifyQr: "/api/borrower/payments/verify-qr",
  },
  transactions: {
    list: "/api/borrower/transactions",
    byId: (id: string) => `/api/borrower/transactions/${id}`,
  },
  creditScore: {
    get: "/api/borrower/credit-score",
    summary: "/api/borrower/credit-score",
    history: "/api/borrower/credit-score/history",
    recalculate: "/api/borrower/credit-score/recalculate",
  },
};
