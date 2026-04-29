/** @format */

export const ENDPOINTS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    me: "/auth/me",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
  },

  profile: {
    create: "/borrower/profile",
    get: (userId: string) => `/borrower/profile/${userId}`,
    update: (userId: string) => `/borrower/profile/${userId}`,
  },

  applications: {
    create: "/borrower/applications",
    list: "/borrower/applications",
    byId: (applicationId: string) => `/borrower/applications/${applicationId}`,
    update: (applicationId: string) =>
      `/borrower/applications/${applicationId}`,
    submit: (applicationId: string) =>
      `/borrower/applications/${applicationId}/submit`,
    delete: (applicationId: string) =>
      `/borrower/applications/${applicationId}`,
  },

  loans: {
    list: "/borrower/loans",
    featured: "/borrower/loans/featured",
    search: "/borrower/loans/search",
    byId: (loanId: string) => `/borrower/loans/${loanId}`,
    filter: "/borrower/loans/filter",
  },

  repayments: {
    list: "/borrower/payments",
    make: "/borrower/payments",
    generateQr: "/borrower/payments/generate-qr",
    verifyQr: "/borrower/payments/verify-qr",
    uploadReceipt: "/borrower/payments/upload-receipt",
  },

  dashboard: {
    get: (userId: string) => `/borrower/dashboard/${userId}`,
  },

  creditScore: {
    get: "/borrower/credit-score",
    history: "/borrower/credit-score/history",
    recalculate: "/borrower/credit-score/recalculate",
  },

  transactions: {
    list: "/borrower/transactions",
    byId: (transactionId: string) => `/borrower/transactions/${transactionId}`,
  },
} as const;
