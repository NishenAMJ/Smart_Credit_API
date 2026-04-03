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
  },
  loans: {
    featured: "/api/borrower/loans/featured",
    search: "/api/borrower/loans/search",
    list: "/api/borrower/loans",
  },
  applications: {
    list: "/api/borrower/applications",
    create: "/api/borrower/applications",
    byId: (id: string) => `/api/borrower/applications/${id}`,
  },
  payments: {
    list: "/api/borrower/payments",
    pay: "/api/borrower/payments/pay",
  },
  transactions: {
    list: "/api/borrower/transactions",
    byId: (id: string) => `/api/borrower/transactions/${id}`,
  },
  creditScore: {
    summary: "/api/borrower/credit-score",
    history: "/api/borrower/credit-score/history",
  },
};
