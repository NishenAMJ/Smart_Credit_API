// Central registry for lender views so navigation and rendering stay in sync.
import { SettingsIcon } from "lucide-react";
import type { ComponentType, JSX } from "react";

type LenderView =
  | "dashboard"
  | "payments"
  | "analytics"
  | "active-ads-requests"
  | "create-ad"
  | "pending-requests"
  | "settings"
  | "notifications"
  | "agreements";

type LenderViewConfig = {
  id: LenderView;
  label: string;
  icon: ComponentType;
  showInSidebar: boolean;
};

function DashboardIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13" y="4.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="4.5" y="13" width="6.5" height="6.5" rx="1.5" />
      <rect x="13" y="13" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

function TransactionsIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="5.5" width="16" height="13" rx="2.5" />
      <path d="M4 10h16" />
      <path d="M8 14h3.5" />
      <path d="M14.5 14H16" />
    </svg>
  );
}

function AnalyticsIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 19.5h14" />
      <path d="M8 17V11" />
      <path d="M12 17V7" />
      <path d="M16 17v-4" />
    </svg>
  );
}

function CreateAdIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
    </svg>
  );
}

function AgreementsIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function SidebarSettingsIcon(): JSX.Element {
  return <SettingsIcon size={20} strokeWidth={1.8} />;
}

const lenderViewRegistry: LenderViewConfig[] = [
  // Sidebar visibility is intentionally narrower than the full set of lender routes.
  {
    id: "dashboard",
    label: "Dashboard",
    icon: DashboardIcon,
    showInSidebar: true,
  },
  {
    id: "payments",
    label: "Payments",
    icon: TransactionsIcon,
    showInSidebar: true,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: AnalyticsIcon,
    showInSidebar: true,
  },
  {
    id: "active-ads-requests",
    label: "Active Ads Requests",
    icon: AnalyticsIcon,
    showInSidebar: false,
  },
  {
    id: "create-ad",
    label: "Create Ad",
    icon: CreateAdIcon,
    showInSidebar: true,
  },
  {
    id: "pending-requests",
    label: "Pending Requests",
    icon: TransactionsIcon,
    showInSidebar: false,
  },
  {
    id: "settings",
    label: "Settings",
    icon: SidebarSettingsIcon,
    showInSidebar: true,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: SidebarSettingsIcon,
    showInSidebar: false,
  },
  {
    id: "agreements",
    label: "Agreements",
    icon: AgreementsIcon,
    showInSidebar: true,
  },
];

export { lenderViewRegistry };
export type { LenderView, LenderViewConfig };
