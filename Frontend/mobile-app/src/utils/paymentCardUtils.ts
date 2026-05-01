/** @format */

import {
  PAYMENT_DEFAULTS,
  PAYMENT_CARD_TITLES,
} from "../constants/paymentConstants";

/**
 * Utility functions for payment card processing.
 * These functions are extracted for:
 * - Better testability (can be unit tested independently)
 * - Reusability across components
 * - Single Responsibility Principle
 */

/**
 * Validates and formats the date to display format.
 * @param dateVal - The date value to format (string or object)
 * @returns Formatted date string or "-" if invalid
 */
export const formatPaymentDate = (dateVal: unknown): string => {
  // Input validation
  if (!dateVal) {
    return "-";
  }

  // Handle Date objects
  if (typeof dateVal === "object" && dateVal instanceof Date) {
    return "-";
  }

  // Handle string dates
  if (typeof dateVal === "string") {
    try {
      return new Date(dateVal).toLocaleDateString(
        PAYMENT_DEFAULTS.LOCALE,
        PAYMENT_DEFAULTS.DEFAULT_DATE_FORMAT,
      );
    } catch (error) {
      console.warn("[formatPaymentDate] Failed to format date:", dateVal);
      return "-";
    }
  }

  return "-";
};

/**
 * Determines the payment status title based on payment type and status.
 * @param paymentType - Type of payment (disbursement, repayment, etc.)
 * @param paymentStatus - Current status (PAID, PENDING, etc.)
 * @returns Appropriate title string
 */
export const getPaymentTitle = (
  paymentType: string | undefined,
  paymentStatus: string | undefined,
): string => {
  if (paymentType === "disbursement") {
    return PAYMENT_CARD_TITLES.LOAN_RECEIVED;
  }
  const s = String(paymentStatus || "").toLowerCase();
  if (s === "paid" || s === "completed") {
    return PAYMENT_CARD_TITLES.PAYMENT_MADE;
  }
  return PAYMENT_CARD_TITLES.NEXT_PAYMENT;
};

/**
 * Extracts the first letter of a name and converts to uppercase.
 * @param name - The name to extract from
 * @param defaultLetter - Default letter if name is empty/null
 * @returns Single uppercase letter
 */
export const getAvatarLetter = (
  name: string | undefined,
  defaultLetter: string = PAYMENT_DEFAULTS.DEFAULT_AVATAR_LETTER,
): string => {
  if (!name || name.trim().length === 0) {
    return defaultLetter;
  }
  return name.charAt(0).toUpperCase();
};

/**
 * Validates and formats currency amount.
 * @param amount - The amount to format
 * @returns Formatted currency string or default "0"
 */
export const formatCurrencyAmount = (amount: number | undefined): string => {
  // Input validation
  if (amount === undefined || amount === null || isNaN(amount)) {
    return PAYMENT_DEFAULTS.DEFAULT_AMOUNT;
  }

  try {
    return amount.toLocaleString();
  } catch (error) {
    console.warn("[formatCurrencyAmount] Failed to format amount:", amount);
    return PAYMENT_DEFAULTS.DEFAULT_AMOUNT;
  }
};

/**
 * Determines if a payment is in paid/completed state.
 * @param paymentStatus - Current payment status
 * @param paymentType - Type of payment
 * @returns Boolean indicating if payment is paid
 */
export const isPaidPayment = (
  paymentStatus: string | undefined,
  paymentType: string | undefined,
): boolean => {
  const s = String(paymentStatus || "").toLowerCase();
  return s === "paid" || s === "completed" || paymentType === "disbursement";
};

/**
 * Determines if a payment is overdue (past due date and not paid).
 * @param dueDate - The due date of the payment
 * @param paymentStatus - Current payment status
 * @param paymentType - Type of payment
 * @returns Boolean indicating if payment is overdue
 */
export const isOverduePayment = (
  dueDate: string | undefined,
  paymentStatus: string | undefined,
  paymentType: string | undefined,
): boolean => {
  // If payment is paid or is a disbursement, it's not overdue
  const isPaid = isPaidPayment(paymentStatus, paymentType);
  if (isPaid) return false;

  // Check if due date has passed
  if (!dueDate) return false;

  try {
    const dueDateObj = new Date(dueDate);
    const today = new Date();
    // Set today to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    dueDateObj.setHours(0, 0, 0, 0);

    return dueDateObj < today;
  } catch (error) {
    console.warn("[isOverduePayment] Failed to parse date:", dueDate);
    return false;
  }
};

/**
 * Determines if the payment card should show the pay button.
 * @param paymentStatus - Current payment status
 * @param paymentType - Type of payment
 * @returns Boolean indicating if pay button should be shown
 */
export const shouldShowPayButton = (
  paymentStatus: string | undefined,
  paymentType: string | undefined,
  paymentMethod?: string | undefined,
): boolean => {
  const isPaid = isPaidPayment(paymentStatus, paymentType);
  const s = String(paymentStatus || "").toLowerCase();
  
  // Hide Pay button if the payment is a pending bank transfer waiting for admin verification
  if (s === "pending" && paymentMethod === "bank_transfer") {
    return false;
  }

  return !isPaid && paymentType !== "disbursement";
};

/**
 * Gets the payment button label based on payment method.
 * @param paymentMethod - Selected payment method
 * @returns Appropriate button label
 */
export const getPaymentButtonLabel = (
  paymentMethod: string | undefined,
): string => {
  return paymentMethod === "QR Payment" ? "Show QR" : "Pay Now";
};

/**
 * Determines the appropriate icon name for payment button.
 * @param paymentMethod - Selected payment method
 * @returns Icon name and icon set type
 */
export const getPaymentButtonIcon = (
  paymentMethod: string | undefined,
): { name: string; type: "feather" | "material" } => {
  if (paymentMethod === "QR Payment") {
    return { name: "qrcode-scan", type: "material" };
  }
  return { name: "send", type: "feather" };
};
