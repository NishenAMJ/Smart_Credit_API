// Lender dashboard with summary cards, borrower search, pagination, and borrower detail modal.
import { type FormEvent, useEffect, useState } from "react";
import type { LenderView } from "../config/lender-views";
import type {
  BorrowerDetails,
  DashboardBorrower,
  DashboardSummary,
} from "../lib/dashboard-api";
import {
  fetchDashboardBorrowers,
  fetchBorrowerDetails,
  fetchDashboardSummary,
} from "../lib/dashboard-api";
import type { LenderSession } from "../lib/lender-session";
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
  borrowerPageSize: number;
};

type DashboardQuickAction = {
  id: Extract<LenderView, "pending-requests" | "settings" | "notifications">;
  icon: "requests" | "settings" | "notifications";
  label: string;
};

const quickActions: DashboardQuickAction[] = [
  // These quick actions intentionally link to hidden or secondary views outside the main sidebar.
  {
    id: "pending-requests",
    icon: "requests",
    label: "Pending requests",
  },
  {
    id: "settings",
    icon: "settings",
    label: "Settings",
  },
  {
    id: "notifications",
    icon: "notifications",
    label: "Notifications",
  },
];

function DashboardQuickActionIcon({
  icon,
}: {
  icon: DashboardQuickAction["icon"];
}) {
  if (icon === "requests") {
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

  if (icon === "settings") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M5 7h14" />
        <path d="M5 17h14" />
        <circle cx="9" cy="7" r="2.2" fill="currentColor" stroke="none" />
        <circle cx="15" cy="17" r="2.2" fill="currentColor" stroke="none" />
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

export default function DashboardPage({
  session,
  onNavigate,
  borrowerPageSize,
}: DashboardPageProps) {
  const [borrowers, setBorrowers] = useState<DashboardBorrower[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [hasMoreBorrowers, setHasMoreBorrowers] = useState(false);
  const [borrowerSearchDraft, setBorrowerSearchDraft] = useState("");
  const [borrowerSearch, setBorrowerSearch] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isBorrowersLoading, setIsBorrowersLoading] = useState(true);
  const [borrowersError, setBorrowersError] = useState<string | null>(null);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(
    null,
  );
  const [selectedBorrower, setSelectedBorrower] =
    useState<BorrowerDetails | null>(null);
  const [isBorrowerLoading, setIsBorrowerLoading] = useState(false);
  const [borrowerError, setBorrowerError] = useState<string | null>(null);
  const activeCursor = pageCursors[currentPage - 1] ?? null;

  useEffect(() => {
    let isMounted = true;

    // Summary metrics are loaded independently from the borrower table so each section can fail or recover on its own.
    const loadSummary = async () => {
      try {
        setIsSummaryLoading(true);
        setSummaryError(null);
        const summaryData = await fetchDashboardSummary();

        if (isMounted) {
          setSummary(summaryData.summary);
        }
      } catch (loadError) {
        if (isMounted) {
          setSummaryError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load dashboard data.",
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
    // Pagination state resets whenever the lender or page size changes.
    setCurrentPage(1);
    setPageCursors([null]);
    setBorrowers([]);
    setHasMoreBorrowers(false);
  }, [borrowerPageSize, session.lenderId]);

  useEffect(() => {
    // Search runs off a submitted query so typing does not refetch the borrower list on every keystroke.
    setCurrentPage(1);
    setPageCursors([null]);
    setBorrowers([]);
    setHasMoreBorrowers(false);
  }, [borrowerSearch]);

  useEffect(() => {
    let isMounted = true;

    // Cursor pagination is maintained locally so next-page fetches can reuse backend cursors without a router state.
    const loadBorrowers = async () => {
      try {
        setIsBorrowersLoading(true);
        setBorrowersError(null);
        const borrowersData = await fetchDashboardBorrowers(
          borrowerPageSize,
          activeCursor,
          borrowerSearch,
        );

        if (isMounted) {
          setBorrowers(borrowersData.borrowers);
          setHasMoreBorrowers(borrowersData.pageInfo.hasMore);
          setPageCursors((current) => {
            const next = current.slice(0, currentPage);

            if (borrowersData.pageInfo.nextCursor) {
              next[currentPage] = borrowersData.pageInfo.nextCursor;
            }

            return next;
          });
        }
      } catch (loadError) {
        if (isMounted) {
          setBorrowersError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load borrower list.",
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
  }, [activeCursor, borrowerPageSize, currentPage, borrowerSearch, session.lenderId]);

  useEffect(() => {
    if (!selectedBorrowerId) {
      return;
    }

    let isMounted = true;

    // Borrower details are fetched lazily when the lender opens the modal from the table.
    const loadBorrower = async () => {
      try {
        setIsBorrowerLoading(true);
        setBorrowerError(null);
        const details = await fetchBorrowerDetails(selectedBorrowerId);

        if (isMounted) {
          setSelectedBorrower(details);
        }
      } catch (loadError) {
        if (isMounted) {
          setBorrowerError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load borrower details.",
          );
        }
      } finally {
        if (isMounted) {
          setIsBorrowerLoading(false);
        }
      }
    };

    void loadBorrower();

    return () => {
      isMounted = false;
    };
  }, [selectedBorrowerId, session.lenderId]);

  useEffect(() => {
    if (!selectedBorrowerId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseBorrowerModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedBorrowerId]);

  const visibleBorrowers = borrowers;

  const summaryCards = [
    {
      label: "Total Borrowers",
      value: summary ? String(summary.totalBorrowers) : "--",
      caption: "Borrowers linked to you",
      accent: "BR",
    },
    {
      label: "Today's Collection",
      value: summary ? formatCurrency(summary.todaysCollection) : "--",
      caption: "Collected today",
      accent: "LKR",
    },
    {
      label: "Overdue Payments",
      value: summary ? String(summary.overduePayments) : "--",
      caption: "Currently overdue",
      accent: "OD",
    },
    {
      label: "Active Ads",
      value: summary ? String(summary.activeAds) : "--",
      caption: "Live ads",
      accent: "AD",
    },
  ];

  const detailFields = selectedBorrower
    // Detail fields are assembled as label/value pairs so the modal markup can stay generic.
    ? [
        { label: "Borrower ID", value: selectedBorrower.id },
        { label: "Full Name", value: selectedBorrower.fullName },
        { label: "Email", value: selectedBorrower.email },
        { label: "Phone", value: selectedBorrower.phone ?? "Not available" },
        {
          label: "Address",
          value: selectedBorrower.address ?? "Not available",
        },
        { label: "NIC", value: selectedBorrower.nic ?? "Not available" },
        { label: "Role", value: formatLabel(selectedBorrower.role) },
        { label: "KYC Status", value: formatLabel(selectedBorrower.kycStatus) },
        {
          label: "Credit Score",
          value:
            selectedBorrower.creditScore !== null
              ? String(selectedBorrower.creditScore)
              : "Not available",
        },
        {
          label: "Rating",
          value:
            selectedBorrower.rating !== null
              ? selectedBorrower.rating.toFixed(1)
              : "Not available",
        },
        {
          label: "Loans With This Lender",
          value: String(selectedBorrower.loanCount),
        },
        {
          label: "Active Loans",
          value: String(selectedBorrower.activeLoansCount),
        },
        {
          label: "Total Borrowed From You",
          value: formatCurrency(selectedBorrower.totalBorrowedAmount),
        },
        {
          label: "Outstanding With You",
          value: formatCurrency(selectedBorrower.outstandingAmount),
        },
        {
          label: "Account Status",
          value: selectedBorrower.isActive ? "Active" : "Suspended",
        },
        {
          label: "Joined",
          value: formatJoinedDate(selectedBorrower.createdAt),
        },
      ]
    : [];

  function handleOpenBorrowerModal(borrowerId: string) {
    // Opening a new borrower clears the previous modal payload so loading and error states are accurate.
    setSelectedBorrowerId(borrowerId);
    setSelectedBorrower(null);
    setBorrowerError(null);
  }

  function handleCloseBorrowerModal() {
    setSelectedBorrowerId(null);
    setSelectedBorrower(null);
    setBorrowerError(null);
  }

  function handleBorrowerSearchSubmit(event: FormEvent<HTMLFormElement>) {
    // Commit the current search draft into the applied query only when the form is submitted.
    event.preventDefault();
    setBorrowerSearch(borrowerSearchDraft.trim());
  }

  return (
    <>
      <section className="dashboard-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Overview</p>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Borrowers, collections, and ads.</p>
            <p className="dashboard-context-pill">{session.displayName}</p>
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
                    <DashboardQuickActionIcon icon={action.icon} />
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

        {isSummaryLoading ? (
          <section className="card loading-card">
            <p>Loading dashboard data...</p>
          </section>
        ) : summaryError ? (
          <section className="card error-card">
            <h2>Dashboard unavailable</h2>
            <p>{summaryError}</p>
          </section>
        ) : (
          <>
            <section className="summary-grid" aria-label="Dashboard summary">
              {summaryCards.map((card, index) => (
                <article className="card metric-card" key={card.label}>
                  <div
                    className={`metric-icon metric-icon--${getMetricTone(index)}`}
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

            <section className="card borrowers-card">
              <div className="borrowers-toolbar">
                <div>
                  <h2 className="section-title">Borrowers Linked To You</h2>
                  <p className="section-subtitle">
                    Borrowers with at least one loan from you.
                  </p>
                </div>
                <form
                  className="search-field search-field--with-submit"
                  onSubmit={handleBorrowerSearchSubmit}
                >
                  <button
                    type="submit"
                    className="search-field__submit"
                    aria-label="Search borrowers"
                    disabled={isBorrowersLoading}
                  >
                    Search
                  </button>
                  <input
                    type="search"
                    className="input"
                    placeholder="Search borrowers by name or email"
                    value={borrowerSearchDraft}
                    onChange={(event) =>
                      setBorrowerSearchDraft(event.target.value)
                    }
                    aria-label="Search borrowers"
                  />
                </form>
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
                    {isBorrowersLoading ? (
                      <tr>
                        <td className="table-empty" colSpan={6}>
                          Loading borrower list...
                        </td>
                      </tr>
                    ) : borrowersError ? (
                      <tr>
                        <td className="table-empty" colSpan={6}>
                          {borrowersError}
                        </td>
                      </tr>
                    ) : visibleBorrowers.length > 0 ? (
                      visibleBorrowers.map((borrower) => (
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
                              <div>
                                <p className="borrower-name">
                                  {borrower.fullName}
                                </p>
                                <p className="borrower-email">
                                  {borrower.email}
                                </p>
                              </div>
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
                          {borrowerSearch
                            ? "No borrowers matched your search."
                            : "No borrowers found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <p>
                  Showing {visibleBorrowers.length} borrowers on page{" "}
                  {currentPage}
                  {borrowerSearch ? ` for "${borrowerSearch}"` : ""}
                </p>

                <div className="pagination">
                  <button
                    type="button"
                    className="pagination-button"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>

                  <span className="pagination-status">Page {currentPage}</span>

                  <button
                    type="button"
                    className="pagination-button"
                    onClick={() => setCurrentPage((page) => page + 1)}
                    disabled={!hasMoreBorrowers}
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
        <div
          className="borrower-modal__backdrop"
          role="presentation"
          onClick={handleCloseBorrowerModal}
        >
          <section
            className="borrower-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="borrower-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="borrower-modal__header">
              <div>
                <p className="eyebrow">Borrower details</p>
                <h2 className="section-title" id="borrower-modal-title">
                  {selectedBorrower?.fullName ?? "Loading borrower..."}
                </h2>
                <p className="section-subtitle">Borrower profile and loans.</p>
              </div>
              <button
                type="button"
                className="borrower-modal__close"
                aria-label="Close borrower details"
                onClick={handleCloseBorrowerModal}
              >
                X
              </button>
            </div>

            <div className="borrower-modal__body">
              {isBorrowerLoading ? (
                <div className="borrower-modal__state">
                  Loading borrower details...
                </div>
              ) : borrowerError ? (
                <div className="borrower-modal__state borrower-modal__state--error">
                  {borrowerError}
                </div>
              ) : selectedBorrower ? (
                <div className="borrower-modal__content">
                  <div className="borrower-modal__grid">
                    {detailFields.map((field) => (
                      <article
                        className="borrower-detail-card"
                        key={field.label}
                      >
                        <p className="borrower-detail-card__label">
                          {field.label}
                        </p>
                        <p className="borrower-detail-card__value">
                          {field.value}
                        </p>
                      </article>
                    ))}
                  </div>

                  <section className="borrower-loans-section">
                    <div className="borrower-loans-section__header">
                      <div>
                        <h3 className="section-title">
                          Loans With This Lender
                        </h3>
                      </div>
                    </div>

                    <div className="borrower-loan-list">
                      {selectedBorrower.loans.map((loan) => (
                        <article className="borrower-loan-card" key={loan.id}>
                          <div className="borrower-loan-card__header">
                            <div>
                              <p className="borrower-loan-card__eyebrow">
                                Loan ID
                              </p>
                              <h4 className="borrower-loan-card__title">
                                {loan.id}
                              </h4>
                            </div>
                            <span className="badge badge-gray">
                              {formatLabel(loan.status)}
                            </span>
                          </div>

                          <div className="borrower-loan-card__grid">
                            <div>
                              <p className="borrower-detail-card__label">
                                Amount
                              </p>
                              <p className="borrower-detail-card__value">
                                {formatCurrency(loan.amount)}
                              </p>
                            </div>
                            <div>
                              <p className="borrower-detail-card__label">
                                Remaining
                              </p>
                              <p className="borrower-detail-card__value">
                                {formatCurrency(loan.remainingAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="borrower-detail-card__label">
                                Interest Rate
                              </p>
                              <p className="borrower-detail-card__value">
                                {loan.interestRate.toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="borrower-detail-card__label">
                                Tenure
                              </p>
                              <p className="borrower-detail-card__value">
                                {loan.tenureMonths} months
                              </p>
                            </div>
                            <div>
                              <p className="borrower-detail-card__label">
                                Created
                              </p>
                              <p className="borrower-detail-card__value">
                                {formatJoinedDate(loan.createdAt)}
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
