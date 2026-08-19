import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CalendarDays,
  CheckCheck,
  RefreshCw,
  Search,
  Tags,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { LenderView } from "../components/common/LenderSidebar";
import type { LenderSession } from "../lib/lender-session";
import {
  fetchLenderNotificationSummary,
  fetchLenderNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type LenderNotification,
  type LenderNotificationsSummaryResponse,
  type NotificationCategory,
  type NotificationStateFilter,
} from "../lib/lender-notifications-api";

type NotificationsPageProps = {
  session: LenderSession;
  onNavigate: (view: LenderView) => void;
};

function SummaryIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon size={22} strokeWidth={1.8} />;
}

const CATEGORY_OPTIONS = [
  { key: "all", label: "All" },
  { key: "loan_request", label: "Requests" },
  { key: "transaction", label: "Transactions" },
  { key: "repayment_risk", label: "Risk" },
  { key: "dispute", label: "Disputes" },
  { key: "ad", label: "Ads" },
  { key: "system", label: "System" },
] as const;

const STATE_OPTIONS: Array<{ key: NotificationStateFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
];

function formatRelativeTime(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown time";
  }

  const diff = parsed.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutes = Math.round(diff / (1000 * 60));

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, "minute");
  }

  const hours = Math.round(diff / (1000 * 60 * 60));

  if (Math.abs(hours) < 24) {
    return formatter.format(hours, "hour");
  }

  const days = Math.round(diff / (1000 * 60 * 60 * 24));

  if (Math.abs(days) < 30) {
    return formatter.format(days, "day");
  }

  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatCategoryLabel(value: NotificationCategory | null): string {
  if (!value) {
    return "No activity yet";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getSeverityBadgeClass(value: string): string {
  if (value === "critical") {
    return "badge-danger";
  }

  if (value === "warning") {
    return "badge-gray";
  }

  if (value === "success") {
    return "badge-success";
  }

  return "badge-gray";
}

function getCategoryTone(value: NotificationCategory): string {
  switch (value) {
    case "loan_request":
      return "primary";
    case "transaction":
      return "success";
    case "repayment_risk":
      return "warning";
    case "dispute":
      return "danger";
    case "ad":
      return "primary";
    case "system":
      return "neutral";
  }
}

function NotificationCategoryIcon({
  category,
}: {
  category: NotificationCategory;
}) {
  if (category === "loan_request") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4.75 8.75h14.5v9a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2v-9Z" />
        <path d="M8 8.75V6.5a4 4 0 0 1 8 0v2.25" />
        <path d="M8.5 13h7" />
      </svg>
    );
  }

  if (category === "transaction") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M5 7h14" />
        <path d="M5 12h14" />
        <path d="M5 17h10" />
      </svg>
    );
  }

  if (category === "repayment_risk") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 4 4.5 18.5h15L12 4Z" />
        <path d="M12 9.25v4.5" />
        <circle cx="12" cy="16.75" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (category === "dispute") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M7 7h10" />
        <path d="M7 12h6" />
        <path d="M8 4.75h8a3 3 0 0 1 3 3v8.5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-8.5a3 3 0 0 1 3-3Z" />
      </svg>
    );
  }

  if (category === "ad") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="5" y="5.5" width="14" height="13" rx="2.2" />
        <path d="M8 9.25h8" />
        <path d="M8 13h5" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 5a4.5 4.5 0 0 1 4.5 4.5v2.18c0 .76.25 1.5.72 2.1l1.03 1.32H5.75l1.03-1.32c.47-.6.72-1.34.72-2.1V9.5A4.5 4.5 0 0 1 12 5Z" />
      <path d="M10 18a2.25 2.25 0 0 0 4 0" />
    </svg>
  );
}

export default function NotificationsPage({
  session,
  onNavigate,
}: NotificationsPageProps) {
  const [summary, setSummary] =
    useState<LenderNotificationsSummaryResponse | null>(null);
  const [notifications, setNotifications] = useState<LenderNotification[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedState, setSelectedState] =
    useState<NotificationStateFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadNotifications() {
    const [summaryResponse, listResponse] = await Promise.all([
      fetchLenderNotificationSummary(session.lenderId),
      fetchLenderNotifications(
        session.lenderId,
        selectedCategory,
        selectedState,
        80,
      ),
    ]);

    setSummary(summaryResponse);
    setNotifications(listResponse.notifications);
  }

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [summaryResponse, listResponse] = await Promise.all([
          fetchLenderNotificationSummary(session.lenderId),
          fetchLenderNotifications(
            session.lenderId,
            selectedCategory,
            selectedState,
            80,
          ),
        ]);

        if (isMounted) {
          setSummary(summaryResponse);
          setNotifications(listResponse.notifications);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load notifications.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [selectedCategory, selectedState, session.lenderId]);

  async function handleNotificationAction(notification: LenderNotification) {
    try {
      if (!notification.isRead) {
        const updated = await markNotificationAsRead(
          session.lenderId,
          notification.id,
        );
        setNotifications((current) =>
          selectedState === "unread"
            ? current.filter((item) => item.id !== updated.id)
            : current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setSummary((current) =>
          current
            ? {
                ...current,
                unreadCount: Math.max(0, current.unreadCount - 1),
              }
            : current,
        );
      }

      if (notification.actionTarget) {
        onNavigate(notification.actionTarget);
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to update notification.",
      );
    }
  }

  async function handleMarkAllVisibleAsRead() {
    try {
      setIsMarkingAll(true);
      setError(null);
      await markAllNotificationsAsRead(
        session.lenderId,
        selectedCategory,
        selectedState,
      );
      await loadNotifications();
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : "Failed to mark notifications as read.",
      );
    } finally {
      setIsMarkingAll(false);
    }
  }

  async function handleRefresh() {
    try {
      setIsRefreshing(true);
      setError(null);
      await loadNotifications();
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Failed to refresh notifications.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  const summaryCards = useMemo(() => {
    if (!summary) {
      return [];
    }

    return [
      {
        label: "Unread Total",
        value: String(summary.unreadCount),
        caption: "Notifications still waiting for lender action",
        icon: BellRing,
        tone: "primary",
      },
      {
        label: "High Priority",
        value: String(summary.highPriorityCount),
        caption: "Warning or critical items across the inbox",
        icon: TriangleAlert,
        tone: "danger",
      },
      {
        label: "Today's Activity",
        value: String(summary.todaysCount),
        caption: "Notifications created today",
        icon: CalendarDays,
        tone: "warning",
      },
      {
        label: "Top Category",
        value: formatCategoryLabel(summary.topCategory),
        caption: "Category with the most current activity",
        icon: Tags,
        tone: "success",
      },
    ];
  }, [summary]);

  const visibleUnreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  const visibleNotifications = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return notifications;
    }

    return notifications.filter((notification) =>
      [
        notification.title,
        notification.message,
        formatCategoryLabel(notification.category),
      ].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [notifications, searchQuery]);

  return (
    <section className="dashboard-panel">
      <header className="page-header">
        <div>
          <p className="eyebrow">Lender inbox</p>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            Review operational alerts first, then quieter system notices that
            can wait until later.
          </p>
        </div>

        <div className="analytics-header-tools">
          <div className="analytics-lender-pill">
            {summary ? `${summary.unreadCount} unread` : "Inbox loading"}
          </div>
        </div>
      </header>

      {isLoading ? (
        <section className="card loading-card">
          <p>Loading notifications...</p>
        </section>
      ) : error && !summary ? (
        <section className="card error-card">
          <h2>Notifications are not available yet</h2>
          <p>{error}</p>
          <p>
            Check the lender notifications API, Firestore connection, and lender
            data sources used for backfill.
          </p>
        </section>
      ) : (
        <>
          {error ? (
            <p className="create-ad-banner create-ad-banner--error">{error}</p>
          ) : null}

          <section className="summary-grid" aria-label="Notifications summary">
            {summaryCards.map((card) => (
              <article
                className="card metric-card notification-summary-card"
                key={card.label}
              >
                <div
                  className={`metric-icon metric-icon--${card.tone}`}
                  aria-hidden="true"
                >
                  <SummaryIcon icon={card.icon} />
                </div>
                <div className="metric-copy">
                  <p className="metric-label">{card.label}</p>
                  <p className="metric-value">{card.value}</p>
                  <p className="metric-caption">{card.caption}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="card notifications-card">
            <div className="notifications-toolbar">
              <div>
                <h2 className="section-title">Inbox</h2>
                <p className="section-subtitle">
                  Clicking an item marks it as read and takes the lender to the
                  relevant page when an action is available.
                </p>
              </div>

              <div className="notifications-toolbar__actions">
                <button
                  type="button"
                  className="notifications-icon-button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  aria-label="Refresh notifications"
                  title="Refresh notifications"
                >
                  <RefreshCw
                    size={17}
                    className={
                      isRefreshing ? "notifications-icon--spinning" : undefined
                    }
                    aria-hidden="true"
                  />
                </button>
                <select
                  className="pending-requests-select__control"
                  value={selectedState}
                  onChange={(event) =>
                    setSelectedState(
                      event.target.value as NotificationStateFilter,
                    )
                  }
                >
                  {STATE_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="create-ad-button create-ad-button--ghost notifications-mark-read"
                  onClick={handleMarkAllVisibleAsRead}
                  disabled={isMarkingAll || visibleUnreadCount === 0}
                >
                  <CheckCheck size={17} aria-hidden="true" />
                  {isMarkingAll ? "Updating..." : "Mark all read"}
                </button>
              </div>
            </div>

            <div className="notifications-filter-bar">
              <div className="notifications-category-tabs" role="tablist">
                {CATEGORY_OPTIONS.map((option) => {
                  const count =
                    option.key === "all"
                      ? (summary?.totalCount ?? 0)
                      : (summary?.countsByCategory[option.key] ?? 0);

                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={`notifications-category-tab${
                        selectedCategory === option.key
                          ? " notifications-category-tab--active"
                          : ""
                      }`}
                      onClick={() => setSelectedCategory(option.key)}
                    >
                      {option.label}
                      <span>{count}</span>
                    </button>
                  );
                })}
              </div>

              <label className="notifications-search">
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search notifications"
                  aria-label="Search notifications"
                />
              </label>
            </div>

            <div className="notifications-list">
              {visibleNotifications.length > 0 ? (
                visibleNotifications.map((notification) => (
                  <article
                    className={`notifications-item${
                      notification.isRead ? "" : " notifications-item--unread"
                    }`}
                    key={notification.id}
                  >
                    <button
                      type="button"
                      className="notifications-item__main"
                      onClick={() => handleNotificationAction(notification)}
                    >
                      <span
                        className={`notifications-item__icon notifications-item__icon--${getCategoryTone(
                          notification.category,
                        )}`}
                        aria-hidden="true"
                      >
                        <NotificationCategoryIcon
                          category={notification.category}
                        />
                      </span>

                      <div className="notifications-item__copy">
                        <div className="notifications-item__topline">
                          <h3 className="notifications-item__title">
                            {notification.title}
                          </h3>
                          {!notification.isRead ? (
                            <span
                              className="notifications-item__dot"
                              aria-hidden="true"
                            />
                          ) : null}
                        </div>
                        <p className="notifications-item__message">
                          {notification.message}
                        </p>
                        <div className="notifications-item__meta">
                          <span className="notifications-item__time">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                          <span className="notifications-item__category">
                            {formatCategoryLabel(notification.category)}
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="notifications-item__side">
                      <span
                        className={`badge ${getSeverityBadgeClass(notification.severity)}`}
                      >
                        {notification.severity}
                      </span>

                      {notification.actionLabel && notification.actionTarget ? (
                        <button
                          type="button"
                          className="create-ad-button create-ad-button--ghost notifications-item__cta"
                          onClick={() => handleNotificationAction(notification)}
                        >
                          {notification.actionLabel}
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              ) : (
                <div className="notifications-empty-state">
                  <BellRing size={24} aria-hidden="true" />
                  <strong>Nothing to review</strong>
                  <span>
                    {searchQuery.trim()
                      ? "No notifications match your search."
                      : "No notifications match the selected filters."}
                  </span>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
