/** @format */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  STATUS_COLORS,
  PAYMENT_CARD_UI,
  PAYMENT_DEFAULTS,
  PAYMENT_BUTTON_LABELS,
  CURRENCY,
} from "../../constants/paymentConstants";
import {
  formatPaymentDate,
  getPaymentTitle,
  getAvatarLetter,
  formatCurrencyAmount,
  isPaidPayment,
  isOverduePayment,
  shouldShowPayButton,
  getPaymentButtonLabel,
  getPaymentButtonIcon,
} from "../../utils/paymentCardUtils";

/**
 * Type definition for Payment object.
 * Ensures type safety and clear contract for payment data.
 */
interface IPayment {
  dueDate?: string;
  paidAt?: string;
  timestamp?: string;
  amount?: number;
  lenderName?: string;
  status?: string;
  type?: string;
}

/**
 * Props for PaymentCard component.
 * Explicitly defines all accepted props with clear documentation.
 */
interface IPaymentCardProps {
  /** Payment data object containing amount, dates, status, etc. */
  payment: IPayment;
  /** Selected payment method (Card, Bank Transfer, QR Payment) */
  paymentMethod?: string;
  /** Callback fired when pay button is pressed */
  onPay?: () => void;
  /** Callback fired when card is pressed (legacy, not used) */
  onPress?: () => void;
}

/**
 * PaymentCard Component
 *
 * Displays a payment card with:
 * - Lender information and avatar
 * - Payment amount and due date
 * - Payment status (Pending/Paid)
 * - Pay button for pending payments
 *
 * @component
 * @example
 * const payment = { amount: 5000, lenderName: "Urban Trust", status: "PENDING" };
 * return <PaymentCard payment={payment} onPay={() => handlePayment()} />;
 */
export default function PaymentCard({
  payment,
  paymentMethod,
  onPay,
  onPress,
}: IPaymentCardProps) {
  // Validation: ensure payment object exists
  if (!payment) {
    console.warn("[PaymentCard] Payment object is required");
    return null;
  }

  // Determine payment state
  const isPaid = isPaidPayment(payment.status, payment.type);
  const isOverdue = isOverduePayment(
    payment.dueDate,
    payment.status,
    payment.type,
  );
  const showPayButton = shouldShowPayButton(payment.status, payment.type);

  // Determine status colors based on payment state
  let statusColor: string = STATUS_COLORS.PENDING.text;
  let statusBgColor: string = STATUS_COLORS.PENDING.background;
  let statusLabel: string = PAYMENT_BUTTON_LABELS.PENDING;

  if (isPaid) {
    statusColor = STATUS_COLORS.PAID.text;
    statusBgColor = STATUS_COLORS.PAID.background;
    statusLabel = PAYMENT_BUTTON_LABELS.PAID;
  } else if (isOverdue) {
    statusColor = STATUS_COLORS.OVERDUE.text;
    statusBgColor = STATUS_COLORS.OVERDUE.background;
    statusLabel = PAYMENT_BUTTON_LABELS.OVERDUE;
  }

  // Wrap card with TouchableOpacity only for paid payments
  const cardContent = (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.leftContent}>
          {/* Avatar with lender initial */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getAvatarLetter(payment.lenderName)}
            </Text>
          </View>

          {/* Lender and payment information */}
          <View style={styles.info}>
            <Text style={styles.title}>
              {getPaymentTitle(payment.type, payment.status)}
            </Text>
            <Text style={styles.lenderName}>
              {payment.lenderName?.trim() ||
                PAYMENT_DEFAULTS.DEFAULT_LENDER_NAME}
            </Text>
            <Text style={styles.date}>
              {formatPaymentDate(
                payment.timestamp ?? payment.paidAt ?? payment.dueDate,
              )}
            </Text>
          </View>
        </View>

        {/* Payment status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
          {!isPaid ? (
            <>
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </>
          ) : (
            <>
              <Feather name='check-circle' size={14} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Divider between header and footer */}
      <View style={styles.divider} />

      {/* Payment amount and action button */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.amountLabel}>Amount Due</Text>
          <Text style={styles.amount}>
            {CURRENCY.SYMBOL} {formatCurrencyAmount(payment.amount)}
          </Text>
        </View>

        {/* Pay button - only shown for pending payments */}
        {showPayButton && (
          <TouchableOpacity style={styles.payButton} onPress={onPay}>
            {/* Dynamic icon based on payment method */}
            {(() => {
              const icon = getPaymentButtonIcon(paymentMethod);
              const iconProps = {
                size: PAYMENT_CARD_UI.ICON_SIZE,
                color: "#FFFFFF",
                style: { marginRight: PAYMENT_CARD_UI.ICON_MARGIN_RIGHT },
              };

              return icon.type === "material" ? (
                <MaterialCommunityIcons
                  name={icon.name as any}
                  {...iconProps}
                />
              ) : (
                <Feather name={icon.name as any} {...iconProps} />
              );
            })()}
            <Text style={styles.payButtonText}>
              {getPaymentButtonLabel(paymentMethod)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // If payment is paid and onPress callback exists, wrap with TouchableOpacity
  if (isPaid && onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  /** Card container with elevation and left border accent */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: PAYMENT_CARD_UI.CARD_BORDER_RADIUS,
    padding: PAYMENT_CARD_UI.CARD_PADDING,
    marginBottom: PAYMENT_CARD_UI.CARD_MARGIN_BOTTOM,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderLeftWidth: PAYMENT_CARD_UI.CARD_BORDER_LEFT_WIDTH,
    borderLeftColor: "#007AFF",
  },

  /** Header container - lender info and status */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  /** Left section containing avatar and info */
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  /** Avatar circle for lender initial */
  avatar: {
    width: PAYMENT_CARD_UI.AVATAR_SIZE,
    height: PAYMENT_CARD_UI.AVATAR_SIZE,
    borderRadius: PAYMENT_CARD_UI.AVATAR_BORDER_RADIUS,
    backgroundColor: "#EAF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  /** Avatar text (lender initial) */
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
  },

  /** Information section (title, lender name, date) */
  info: {
    flex: 1,
  },

  /** Payment title text */
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 3,
  },

  /** Lender name text */
  lenderName: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },

  /** Date text */
  date: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  /** Status badge (Pending/Paid) */
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },

  /** Status indicator dot */
  statusDot: {
    width: PAYMENT_CARD_UI.STATUS_DOT_SIZE,
    height: PAYMENT_CARD_UI.STATUS_DOT_SIZE,
    borderRadius: PAYMENT_CARD_UI.STATUS_DOT_SIZE / 2,
  },

  /** Status text (Pending/Paid) */
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  /** Divider line between header and footer */
  divider: {
    height: PAYMENT_CARD_UI.DIVIDER_HEIGHT,
    backgroundColor: "#F3F4F6",
    marginBottom: 14,
  },

  /** Footer container - amount and button */
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  /** Amount due label */
  amountLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
    fontWeight: "500",
  },

  /** Payment amount text (large and bold) */
  amount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
  },

  /** Pay button styling - primary action */
  payButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  /** Pay button text */
  payButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  // Legacy styles - kept for backwards compatibility if needed
  actions: {
    flexDirection: "row",
  },

  payActionButton: {
    backgroundColor: "#E0F2FE",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  payActionText: {
    color: "#007AFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
