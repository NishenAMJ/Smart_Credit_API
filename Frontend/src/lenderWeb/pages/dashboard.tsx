import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CircleAlert,
  ClipboardList,
  Megaphone,
  Settings,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { LenderView } from "../components/common/LenderSidebar";
import BorrowerSidePanel from "../components/borrowers/BorrowerSidePanel";
import type {
  DashboardBorrower,
  DashboardBorrowersResponse,
  DashboardSummary,
} from "../lib/dashboard-api";
import {
  fetchDashboardBorrowers,
  fetchDashboardSummary,
} from "../lib/dashboard-api";
import type { LenderSession } from "../lib/lender-session";

const ITEMS_PER_PAGE = 8;

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-LK", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const joinedDateFormatter = new Intl.DateTimeFormat("en-LK", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatJoinedDate(value: string | null): string {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Unknown"
    : joinedDateFormatter.format(parsed);
}

function getMetricTone(index: number): string {
  const tones = ["primary", "success", "warning", "danger"];
  return tones[index] ?? "primary";
}

type DashboardPageProps = {
  session: LenderSession;
  onNavigate: (view: LenderView) => void;
};

type DashboardQuickAction = {
  id: Extract<LenderView, "pending-requests" | "settings" | "notifications">;
  icon: LucideIcon;
  label: string;
};

const quickActions: DashboardQuickAction[] = [
  {
    id: "pending-requests",
    icon: ClipboardList,
    label: "Pending requests",
  },
  {
    id: "settings",
    icon: Settings,
    label: "Settings",
  },
  {
    id: "notifications",
    icon: Bell,
    label: "Notifications",
  },
];

function IconSymbol({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon size={22} strokeWidth={1.8} />;
}

export default function DashboardPage({
  session,
  onNavigate,
}: DashboardPageProps) {
  const [borrowers, setBorrowers] = useState<DashboardBorrower[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [borrowersPageInfo, setBorrowersPageInfo] = useState<
    DashboardBorrowersResponse["pageInfo"]
  >({
    pageSize: ITEMS_PER_PAGE,
    hasMore: false,
    nextCursor: null,
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isBorrowersLoading, setIsBorrowersLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [borrowersError, setBorrowersError] = useState<string | null>(null);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(
    null,
  );
  const activeCursor = pageCursors[currentPage - 1] ?? null;

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      try {
        setIsSummaryLoading(true);
        setSummaryError(null);
        const summaryData = await fetchDashboardSummary(session.lenderId);

        if (isMounted) {
          setSummary(summaryData.summary);
        }
      } catch (summaryLoadError) {
        if (isMounted) {
          setSummaryError(
            summaryLoadError instanceof Error
              ? summaryLoadError.message
              : "Failed to load dashboard summary.",
          );
        }
      } finally {
        if (isMounted) {
          setIsSummaryLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, [session.lenderId]);

  useEffect(() => {
    setCurrentPage(1);
    setPageCursors([null]);
    setBorrowers([]);
    setBorrowersPageInfo({
      pageSize: ITEMS_PER_PAGE,
      hasMore: false,
      nextCursor: null,
    });
    setSummary(null);
    setSummaryError(null);
    setBorrowersError(null);
    setSearchQuery("");
  }, [session.lenderId]);

  useEffect(() => {
    let isMounted = true;

    const loadBorrowers = async () => {
      try {
        setIsBorrowersLoading(true);
        setBorrowersError(null);
        setBorrowers([]);
        const borrowersData = await fetchDashboardBorrowers(session.lenderId, {
          pageSize: ITEMS_PER_PAGE,
          cursor: activeCursor,
        });

        if (isMounted) {
          setBorrowers(borrowersData.borrowers);
          setBorrowersPageInfo(borrowersData.pageInfo);

          if (borrowersData.pageInfo.nextCursor) {
            setPageCursors((current) => {
              if (current[currentPage] === borrowersData.pageInfo.nextCursor) {
                return current;
              }

              return [
                ...current.slice(0, currentPage),
                borrowersData.pageInfo.nextCursor,
              ];
            });
          }
        }
      } catch (borrowersLoadError) {
        if (isMounted) {
          setBorrowersError(
            borrowersLoadError instanceof Error
              ? borrowersLoadError.message
              : "Failed to load dashboard borrowers.",
          );
        }
      } finally {
        if (isMounted) {
          setIsBorrowersLoading(false);
        }
      }
    };

    void loadBorrowers();

    return () => {
      isMounted = false;
    };
  }, [activeCursor, currentPage, session.lenderId]);

  const filteredBorrowers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return borrowers;
    }

    return borrowers.filter((borrower) => {
      return (
        borrower.fullName.toLowerCase().includes(normalizedQuery) ||
        borrower.email.toLowerCase().includes(normalizedQuery) ||
        formatLabel(borrower.kycStatus)
          .toLowerCase()
          .includes(normalizedQuery) ||
        String(borrower.creditScore ?? "").includes(normalizedQuery) ||
        formatLabel(borrower.latestLoanStatus)
          .toLowerCase()
          .includes(normalizedQuery)
      );
    });
  }, [borrowers, searchQuery]);

  const visibleStart =
    borrowers.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const visibleEnd =
    borrowers.length === 0 ? 0 : visibleStart + borrowers.length - 1;
  const isInitialLoading =
    (isSummaryLoading || isBorrowersLoading) &&
    !summary &&
    borrowers.length === 0;
  const hasBlockingError =
    !summary &&
    borrowers.length === 0 &&
    Boolean(summaryError || borrowersError);

  const summaryCards = [
    {
      label: "Total Borrowers",
      value: summary ? String(summary.totalBorrowers) : "--",
      caption: "Borrowers who already borrowed from you",
      icon: Users,
      route: null,
    },
    {
      label: "Today's Collection",
      value: summary ? formatCurrency(summary.todaysCollection) : "--",
      caption: "Repayments recorded today from your loans",
      icon: WalletCards,
      route: null,
    },
    {
      label: "Overdue Payments",
      value: summary ? String(summary.overduePayments) : "--",
      caption: "Overdue installments inside your loan book",
      icon: CircleAlert,
      route: null,
    },
    {
      label: "Active Ads",
      value: summary ? String(summary.activeAds) : "--",
      caption: "Approved ads owned by this lender",
      icon: Megaphone,
      route: "active-ads-requests" as const,
    },
  ];

  function handleOpenBorrowerModal(borrowerId: string) {
    setSelectedBorrowerId(borrowerId);
  }

  function handleCloseBorrowerModal() {
    setSelectedBorrowerId(null);
  }

  return (
    <>
      <section className="dashboard-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">
              Welcome to the Smart Credit Lending Platform
            </p>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Lender workspace for collections, portfolio health, borrower
              activity, and ad performance.
            </p>
            <p className="dashboard-context-pill">
              {session.displayName}
            </p>
          </div>
          <div className="dashboard-header-tools">
            <div
              className="dashboard-quick-actions"
              aria-label="Dashboard quick actions"
            >
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="dashboard-quick-action"
                  onClick={() => onNavigate(action.id)}
                  title={action.label}
                  data-tooltip={action.label}
                  aria-label={action.label}
                >
                  <span
                    className="dashboard-quick-action__symbol"
                    aria-hidden="true"
                  >
                    <IconSymbol icon={action.icon} />
                  </span>
                </button>
              ))}
            </div>

            <div className="header-date">
              <span className="header-date__label">Today</span>
              <strong>{dateFormatter.format(new Date())}</strong>
            </div>
          </div>
        </header>

        {isInitialLoading ? (
          <section className="card loading-card">
            <p>Loading dashboard data...</p>
          </section>
        ) : hasBlockingError ? (
          <section className="card error-card">
            <h2>Dashboard data is not available yet</h2>
            <p>
              {borrowersError ??
                summaryError ??
                "Failed to load dashboard data."}
            </p>
            <p>
              Check whether the Nest API is running, Firebase credentials are
              valid, and the lender has loan records.
            </p>
          </section>
        ) : (
          <>
            <section className="summary-grid" aria-label="Dashboard summary">
              {summaryCards.map((card, index) =>
                card.route ? (
                  <button
                    key={card.label}
                    type="button"
                    className="card metric-card analytics-drilldown-card analytics-drilldown-card--interactive"
                    onClick={() => onNavigate(card.route)}
                  >
                    <div
                      className={`metric-icon metric-icon--${getMetricTone(index)}`}
                      aria-hidden="true"
                    >
                      <IconSymbol icon={card.icon} />
                    </div>
                    <div className="metric-copy">
                      <p className="metric-label">{card.label}</p>
                      <p className="metric-value">{card.value}</p>
                      <p className="metric-caption">{card.caption}</p>
                    </div>
                    <span className="analytics-drilldown-card__hint">View</span>
                  </button>
                ) : (
                  <article className="card metric-card" key={card.label}>
                    <div
                      className={`metric-icon metric-icon--${getMetricTone(index)}`}
                      aria-hidden="true"
                    >
                      <IconSymbol icon={card.icon} />
                    </div>
                    <div className="metric-copy">
                      <p className="metric-label">{card.label}</p>
                      <p className="metric-value">{card.value}</p>
                      <p className="metric-caption">{card.caption}</p>
                    </div>
                  </article>
                ),
              )}
            </section>

            <section className="card borrowers-card">
              <div className="borrowers-toolbar">
                <div>
                  <h2 className="section-title">Borrowers Linked To You</h2>
                  {/* <p className="section-subtitle">
                    These borrowers have taken at least one loan from this
                    lender. If they also borrowed from another lender, those
                    loans stay out of this view.
                  </p> */}
                </div>
                <label className="search-field">
                  <span className="search-field__icon" aria-hidden="true">
                    Search
                  </span>
                  <input
                    className="input"
                    type="search"
                    placeholder="Search borrowers on this page"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </label>
              </div>

              <div className="table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Borrower</th>
                      <th>Credit Score</th>
                      <th>KYC</th>
                      <th>Loans With You</th>
                      <th>Outstanding</th>
                      <th>Latest Loan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowersError ? (
                      <tr>
                        <td className="table-empty" colSpan={6}>
                          {borrowersError}
                        </td>
                      </tr>
                    ) : isBorrowersLoading ? (
                      <tr>
                        <td className="table-empty" colSpan={6}>
                          Loading borrowers...
                        </td>
                      </tr>
                    ) : filteredBorrowers.length > 0 ? (
                      filteredBorrowers.map((borrower) => (
                        <tr
                          key={borrower.id}
                          className="dashboard-table__row"
                          onClick={() => handleOpenBorrowerModal(borrower.id)}
                        >
                          <td>
                            <div className="borrower-cell">
                              <span
                                className="borrower-avatar"
                                aria-hidden="true"
                              >
                                {borrower.fullName.slice(0, 2).toUpperCase()}
                              </span>
                              <p className="borrower-name">
                                {borrower.fullName}
                              </p>
                            </div>
                          </td>
                          <td>{borrower.creditScore ?? "N/A"}</td>
                          <td>
                            <span className="badge badge-gray">
                              {formatLabel(borrower.kycStatus)}
                            </span>
                          </td>
                          <td>
                            {borrower.loanCount} total /{" "}
                            {borrower.activeLoansCount} active
                          </td>
                          <td>{formatCurrency(borrower.outstandingAmount)}</td>
                          <td>
                            <div className="dashboard-table__stack">
                              <span className="badge badge-gray">
                                {formatLabel(borrower.latestLoanStatus)}
                              </span>
                              <span className="dashboard-table__subcopy">
                                {formatJoinedDate(borrower.latestLoanCreatedAt)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="table-empty" colSpan={6}>
                          {searchQuery
                            ? `No borrowers found on this page for "${searchQuery}".`
                            : "No lender-linked borrower data available yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <p>
                  {searchQuery
                    ? `Showing ${filteredBorrowers.length} of ${borrowers.length} borrowers loaded for page ${currentPage}.`
                    : `Showing ${visibleStart}-${visibleEnd} lender-linked borrowers on page ${currentPage}.`}
                </p>

                <div className="pagination">
                  <button
                    type="button"
                    className="pagination-button"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={currentPage === 1 || isBorrowersLoading}
                  >
                    Previous
                  </button>

                  <span className="pagination-status">Page {currentPage}</span>

                  <button
                    type="button"
                    className="pagination-button"
                    onClick={() => setCurrentPage((page) => page + 1)}
                    disabled={!borrowersPageInfo.hasMore || isBorrowersLoading}
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </section>

      {selectedBorrowerId ? (
        <BorrowerSidePanel
          session={session}
          borrowerId={selectedBorrowerId}
          onClose={handleCloseBorrowerModal}
        />
      ) : null}
    </>
  );
}
