/** @format */

import { StyleSheet, Platform, StatusBar } from "react-native";

import { COLORS as BASE_COLORS } from "../constants/colors";
import { BORDER_RADIUS, SHADOWS, SPACING } from "./chat.styles";
import { TYPOGRAPHY as BASE_TYPOGRAPHY } from "../constants/typography";

export const COLORS = {
  primary: BASE_COLORS.primary,
  background: BASE_COLORS.background,
  surface: BASE_COLORS.surface,
  textPrimary: BASE_COLORS.textPrimary,
  textSecondary: BASE_COLORS.textSecondary,
  border: BASE_COLORS.border,
  success: BASE_COLORS.success,
  warning: BASE_COLORS.warning,
  danger: BASE_COLORS.error,
  error: BASE_COLORS.error,
} as const;

export { BORDER_RADIUS, SHADOWS, SPACING, BASE_TYPOGRAPHY as TYPOGRAPHY };

// ── Status bar height ─────────────────────────────────
// Android needs manual status bar offset; iOS is handled by SafeAreaView
const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 0;

export const commonStyles = StyleSheet.create({
  // ── Safe container ────────────────────────────────
  // Adds top padding for Android status bar
  // iOS SafeAreaView handles this automatically
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: STATUS_BAR_HEIGHT,
  },

  // ── Scroll content ────────────────────────────────
  // Extra paddingBottom so content never hides behind
  // the bottom nav bar or home indicator
  scrollContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 100, // clears bottom tab bar + home indicator
  },

  // ── Header bar ────────────────────────────────────
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    // Subtle bottom border so it separates from content
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerFlexRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  headerGreeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  headerName: {
    ...BASE_TYPOGRAPHY.heading,
    color: COLORS.textPrimary,
    marginTop: 2,
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 13,
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm,
  },

  secondaryButton: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  buttonText: {
    color: COLORS.surface,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },

  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "400",
    color: COLORS.textPrimary,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },

  cardLarge: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },

  sectionSubtitle: {
    ...BASE_TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },

  textPrimary: {
    ...BASE_TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },

  textSecondary: {
    ...BASE_TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },

  textSmall: {
    ...BASE_TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },

  badge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: "flex-start",
    backgroundColor: COLORS.background,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },

  rowSpaceBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  gap8: { gap: SPACING.sm },
  gap12: { gap: SPACING.md },
  gap16: { gap: SPACING.lg },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
  },

  alertBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },

  alertText: {
    flex: 1,
    ...BASE_TYPOGRAPHY.small,
    color: "#991B1B",
    lineHeight: 18,
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  shadowSmall: SHADOWS.small,
  shadowMedium: SHADOWS.medium,

  spacer8: { height: SPACING.sm },
  spacer12: { marginVertical: SPACING.sm },
  spacer16: { height: SPACING.lg },
  spacer24: { height: SPACING.xl },
  spacer32: { height: 32 },
});