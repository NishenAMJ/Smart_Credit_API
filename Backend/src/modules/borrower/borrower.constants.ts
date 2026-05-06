export const BORROWER_DEFAULTS = {
  STARTING_CREDIT_SCORE: Number(process.env.STARTING_CREDIT_SCORE) || 300,
  CREDIT_HISTORY_OFFSETS: [25, 10, 0],
} as const;

export const BORROWER_FLOW = {
  FEATURED_LOAN_LIMIT: Number(process.env.FEATURED_LOAN_LIMIT) || 10,
  RECENT_ACTIVITY_LIMIT: Number(process.env.RECENT_ACTIVITY_LIMIT) || 5,
  QR_CODE_PREFIX: 'QR',
} as const;

export const BORROWER_FILTER_LIMITS = {
  MIN_AMOUNT: 0,
  MAX_AMOUNT: Number.MAX_SAFE_INTEGER,
} as const;
