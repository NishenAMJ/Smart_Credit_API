// ── Colors ──────────────────────────────────────────────────────────────────
export const COLORS = {
  primary: "#007AFF",
  background: "#F5F6FA",
  surface: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  border: "#F3F4F6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",

  // Sidebar
  sidebarBg: "#0A1628",
  sidebarText: "#8A9BB5",
  sidebarActive: "#007AFF",
} as const;

// ── Typography ───────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  small: {
    fontSize: "12px",
    fontWeight: 500,
  },
  body: {
    fontSize: "15px",
    fontWeight: 400,
  },
  subtitle: {
    fontSize: "18px",
    fontWeight: 600,
  },
  heading: {
    fontSize: "20px",
    fontWeight: 700,
  },
} as const;

// ── Spacing ───────────────────────────────────────────────────────────────────
export const SPACING = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  xxl: "24px",
} as const;

// ── Border Radius ─────────────────────────────────────────────────────────────
export const BORDER_RADIUS = {
  small: "8px",
  medium: "10px",
  large: "12px",
} as const;

// ── Shadows ───────────────────────────────────────────────────────────────────
export const SHADOWS = {
  light: "0 2px 4px rgba(0, 0, 0, 0.1)",
  card: "0 2px 8px rgba(0, 0, 0, 0.08)",
} as const;

// ── Button Defaults ───────────────────────────────────────────────────────────
export const BUTTON = {
  padding: "12px 16px",
  borderRadius: BORDER_RADIUS.medium,
  fontWeight: 600,
  fontSize: "15px",
} as const;

// ── Card Defaults ─────────────────────────────────────────────────────────────
export const CARD = {
  padding: "16px",
  borderRadius: BORDER_RADIUS.large,
  shadow: SHADOWS.card,
} as const;

// ── Navigation Items ──────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: "LayoutDashboard" },
  { label: "KYC Approvals", path: "/kyc", icon: "ShieldCheck" },
  { label: "Lender Ads", path: "/lender-ads", icon: "Megaphone" },
  { label: "Manage Users", path: "/manage-users", icon: "Users" },
  { label: "Analytics", path: "/analytics", icon: "BarChart2" },
  { label: "Audit Logs", path: "/audit-logs", icon: "ScrollText" },
  { label: "Settings", path: "/settings", icon: "Settings" },
] as const;

// ── Badge Styles (for status labels in tables) ────────────────────────────────
export const BADGE_STYLES = {
  approved: "badge badge-success",
  pending: "badge badge-warning",
  rejected: "badge badge-danger",
  active: "badge badge-info",
  flagged: "badge badge-danger",
} as const;

// ── Type Exports ──────────────────────────────────────────────────────────────
export type BadgeStatus = keyof typeof BADGE_STYLES;
export type NavItem = (typeof NAV_ITEMS)[number];
