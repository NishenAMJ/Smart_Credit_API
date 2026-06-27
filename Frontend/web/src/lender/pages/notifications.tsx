// Lender inbox for categorized notifications, unread management, and action-based navigation.
import { useEffect, useMemo, useState } from "react";
import type { LenderView } from "../config/lender-views";
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
  // Keeps icon selection close to the inbox page so category styling and copy evolve together.
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
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadNotifications() {
    // Reused after bulk actions so the page can resync both header counts and the visible notification list.
    const [summaryResponse, listResponse] = await Promise.all([
      fetchLenderNotificationSummary(),
      fetchLenderNotifications(selectedCategory, selectedState, 80),
    ]);

    setSummary(summaryResponse);
    setNotifications(listResponse.notifications);
  }

  useEffect(() => {
    let isMounted = true;

    // Summary and list are fetched together because the filters affect both the visible items and unread counts.
    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [summaryResponse, listResponse] = await Promise.all([
          fetchLenderNotificationSummary(),
          fetchLenderNotifications(selectedCategory, selectedState, 80),
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
    // Actions first reconcile unread state locally, then navigate if the notification points to another view.
    try {
      if (!notification.isRead) {
        const updated = await markNotificationAsRead(notification.id);
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
    // Bulk mark-as-read applies to the current filters, then performs one fresh reload for consistency.
    try {
      setIsMarkingAll(true);
      setError(null);
      await markAllNotificationsAsRead(selectedCategory, selectedState);
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

  const summaryCards = useMemo(() => {
    // Precompute summary card presentation from the raw counts returned by the notifications summary API.
    if (!summary) {
      return [];
    }

    return [
      {
        label: "Unread Total",
        value: String(summary.unreadCount),
        caption: "Unread items",
        accent: "UN",
        tone: "primary",
      },
      {
        label: "High Priority",
        value: String(summary.highPriorityCount),
        caption: "Priority items",
        accent: "HP",
        tone: "danger",
      },
      {
        label: "Today's Activity",
        value: String(summary.todaysCount),
        caption: "Created today",
        accent: "TD",
        tone: "warning",
      },
      {
        label: "Top Category",
        value: formatCategoryLabel(summary.topCategory),
        caption: "Most active category",
        accent: "TC",
        tone: "success",
      },
    ];
  }, [summary]);

  const visibleUnreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  return (
    <section className="dashboard-panel">
      <header className="page-header">
        <div>
          <p className="eyebrow">Inbox</p>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Lender alerts and updates.</p>
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
          <h2>Notifications unavailable</h2>
          <p>{error}</p>
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
                  {card.accent}
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
                <p className="section-subtitle">Open an item to view it.</p>
              </div>

              <div className="notifications-toolbar__actions">
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
                  className="create-ad-button"
                  onClick={handleMarkAllVisibleAsRead}
                  disabled={isMarkingAll || visibleUnreadCount === 0}
                >
                  {isMarkingAll ? "Updating..." : "Mark All Visible As Read"}
                </button>
              </div>
            </div>

            <div className="notifications-category-tabs" role="tablist">
              {CATEGORY_OPTIONS.map((option) => (
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
                </button>
              ))}
            </div>

            <div className="notifications-list">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
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
                <div className="borrower-modal__state">
                  No notifications found.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
