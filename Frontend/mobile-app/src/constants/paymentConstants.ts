/** @format */

/**
 * Payment card styling and business logic constants.
 * Extracted to follow best practices: no hardcoding, single source of truth.
 */

// Status-related constants
export const PAYMENT_STATUS = {
  PAID: "PAID",
  COMPLETED: "COMPLETED",
  PENDING: "PENDING",
} as const;

export const PAYMENT_TYPE = {
  DISBURSEMENT: "disbursement",
  REPAYMENT: "repayment",
} as const;

// Status color mapping
export const STATUS_COLORS = {
  PENDING: {
    text: "#F59E0B",
    background: "#FFFBEB",
  },
  OVERDUE: {
    text: "#EF4444",
    background: "#FEF2F2",
  },
  PAID: {
    text: "#10B981",
    background: "#F0FDF4",
  },
} as const;

// Payment method constants
export const PAYMENT_METHODS = {
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  QR_PAYMENT: "QR Payment",
} as const;

// UI dimensions and styling
export const PAYMENT_CARD_UI = {
  AVATAR_SIZE: 48,
  AVATAR_BORDER_RADIUS: 24,
  STATUS_DOT_SIZE: 6,
  CARD_BORDER_LEFT_WIDTH: 4,
  CARD_BORDER_RADIUS: 14,
  CARD_PADDING: 16,
  CARD_MARGIN_BOTTOM: 15,
  DIVIDER_HEIGHT: 1,
  ICON_SIZE: 16,
  ICON_MARGIN_RIGHT: 6,
} as const;

// Default values for display
export const PAYMENT_DEFAULTS = {
  DEFAULT_LENDER_NAME: "Lender",
  DEFAULT_AVATAR_LETTER: "L",
  DEFAULT_AMOUNT: "0",
  DEFAULT_DATE_FORMAT: {
    month: "short" as const,
    day: "numeric" as const,
    year: "2-digit" as const,
  },
  LOCALE: "en-US",
} as const;

// Payment card title messages
export const PAYMENT_CARD_TITLES = {
  LOAN_RECEIVED: "Loan Received",
  PAYMENT_MADE: "Payment Made",
  NEXT_PAYMENT: "Next Payment",
} as const;

// Payment button labels
export const PAYMENT_BUTTON_LABELS = {
  SHOW_QR: "Show QR",
  PAY_NOW: "Pay Now",
  PENDING: "Pending",
  PAID: "Paid",
  OVERDUE: "Overdue",
} as const;

// Currency
export const CURRENCY = {
  SYMBOL: "LKR",
} as const;
