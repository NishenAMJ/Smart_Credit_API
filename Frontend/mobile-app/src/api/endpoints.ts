/** @format */

export const ENDPOINTS = {
  SEARCH_LOANS: "/borrower/loans/search",
  FEATURED_LOANS: "/borrower/loans/featured",
  LOAN_DETAILS: (loanId: string) => `/borrower/loans/${loanId}`,
  FILTER_LOANS: "/borrower/loans/filter",
  MY_APPLICATIONS: "/borrower/applications",
  APPLICATION_DETAILS: (applicationId: string) =>
    `/borrower/applications/${applicationId}`,
  CREATE_APPLICATION: "/borrower/applications",
  UPDATE_APPLICATION: (applicationId: string) =>
    `/borrower/applications/${applicationId}`,
  DELETE_APPLICATION: (applicationId: string) =>
    `/borrower/applications/${applicationId}`,
  MY_PAYMENTS: "/borrower/payments",
  CREATE_PAYMENT: "/borrower/payments",
  GENERATE_QR: "/borrower/payments/generate-qr",
  UPLOAD_RECEIPT: "/borrower/payments/upload-receipt",
  MY_TRANSACTIONS: "/borrower/transactions",
  TRANSACTION_DETAILS: (transactionId: string) =>
    `/borrower/transactions/${transactionId}`,
  CREDIT_SCORE: "/borrower/credit-score",
  CREDIT_SCORE_HISTORY: "/borrower/credit-score/history",
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    me: "/auth/me",
    session: "/auth/session",
    borrowerDashboard: "/auth/borrower/dashboard",
    lenderDashboard: "/auth/lender/dashboard",
  },
  kyc: {
    submit: "/kyc/submit",
    mySubmission: "/kyc/my-submission",
  },
  legal: {
    generate: (loanId: string) => `/legal/documents/generate/${loanId}`,
    latestByLoan: (loanId: string) => `/legal/documents/loan/${loanId}/latest`,
    accept: (documentId: string) => `/legal/documents/${documentId}/accept`,
    download: (documentId: string) => `/legal/documents/${documentId}/download`,
    list: "/legal/documents",
  },
  loans: {
    featured: "/borrower/loans/featured",
    search: "/borrower/loans/search",
    list: "/borrower/loans",
    byId: (loanId: string) => `/borrower/loans/${loanId}`,
    filter: "/borrower/loans/filter",
  },
  dashboard: {
    borrower: (borrowerId: string) => `/borrower/dashboard/${borrowerId}`,
    get: (borrowerId: string) => `/borrower/dashboard/${borrowerId}`,
  },
  support: {
    status: "/borrower/support/status",
  },
  profile: {
    get: (userId: string) => `/borrower/profile/${userId}`,
    update: (userId: string) => `/borrower/profile/${userId}`,
  },
  applications: {
    list: "/borrower/applications",
    create: "/borrower/applications",
    byId: (id: string) => `/borrower/applications/${id}`,
    update: (id: string) => `/borrower/applications/${id}`,
    submit: (id: string) => `/borrower/applications/${id}/submit`,
    delete: (id: string) => `/borrower/applications/${id}`,
  },
  repayments: {
    list: "/borrower/payments",
    make: "/borrower/payments",
    generateQr: "/borrower/payments/generate-qr",
    verifyQr: "/borrower/payments/verify-qr",
  },
  transactions: {
    list: "/borrower/transactions",
    byId: (id: string) => `/borrower/transactions/${id}`,
  },
  creditScore: {
    get: "/borrower/credit-score",
    summary: "/borrower/credit-score",
    history: "/borrower/credit-score/history",
    recalculate: "/borrower/credit-score/recalculate",
  },
};
