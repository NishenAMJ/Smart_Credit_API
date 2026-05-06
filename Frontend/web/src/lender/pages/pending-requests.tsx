import { useEffect, useMemo, useState } from "react";
import type { LenderSession } from "../lib/lender-session";
import {
  approvePendingRequest,
  fetchPendingRequests,
  markPendingRequestUnderReview,
  rejectPendingRequest,
  type PendingRequest,
  type PendingRequestsResponse,
} from "../lib/pending-requests-api";

type PendingRequestsPageProps = {
  session: LenderSession;
  pageSize: number;
};
const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function getUrgencyBadgeClass(value: string): string {
  if (value === "critical" || value === "high") {
    return "badge-danger";
  }

  if (value === "medium") {
    return "badge-gray";
  }

  return "badge-success";
}

function getStatusBadgeClass(value: string): string {
  if (value === "approved" || value === "matched") {
    return "badge-success";
  }

  if (value === "under_review" || value === "pending_kyc") {
    return "badge-gray";
  }

  return "badge-danger";
}

export default function PendingRequestsPage({
  session,
  pageSize,
}: PendingRequestsPageProps) {
  const [response, setResponse] = useState<PendingRequestsResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(
    null,
  );
  const [decisionNotes, setDecisionNotes] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);
  const [isDecisionSaving, setIsDecisionSaving] = useState(false);

  async function loadRequests(nextSelectedRequestId?: string | null) {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchPendingRequests(pageSize);
      setResponse(data);

      if (typeof nextSelectedRequestId === "string") {
        const nextSelected =
          data.requests.find(
            (request) => request.requestId === nextSelectedRequestId,
          ) ?? null;
        setSelectedRequest(nextSelected);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load pending requests.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, [pageSize, session.lenderId]);

  useEffect(() => {
    setDecisionNotes("");
    setDecisionError(null);
    setDecisionSuccess(null);
    setIsDecisionSaving(false);
  }, [selectedRequest?.requestId]);

  useEffect(() => {
    if (!selectedRequest) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedRequest(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRequest]);

  const requests = useMemo(
    () => response?.requests ?? [],
    [response?.requests],
  );
  const summary = response?.summary;

  const filteredRequests = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === "all" ? true : request.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        request.borrowerName.toLowerCase().includes(normalizedQuery) ||
        request.borrowerEmail.toLowerCase().includes(normalizedQuery) ||
        request.purpose.toLowerCase().includes(normalizedQuery) ||
        request.requestedRegion.toLowerCase().includes(normalizedQuery) ||
        formatLabel(request.urgency).toLowerCase().includes(normalizedQuery)
      );
    });
  }, [requests, searchQuery, statusFilter]);

  const statusOptions = useMemo(() => {
    return [
      "all",
      ...Array.from(new Set(requests.map((request) => request.status))),
    ];
  }, [requests]);

  const summaryCards = [
    {
      label: "Pending Requests",
      value: summary ? String(summary.totalPendingRequests) : "--",
      caption: "Waiting for review",
      accent: "RQ",
    },
    {
      label: "Targeted Requests",
      value: summary ? String(summary.targetedRequests) : "--",
      caption: "From your ads",
      accent: "TG",
    },
    {
      label: "Marketplace Matches",
      value: summary ? String(summary.marketplaceMatches) : "--",
      caption: "Marketplace matches",
      accent: "MP",
    },
    {
      label: "High Urgency",
      value: summary ? String(summary.highUrgencyRequests) : "--",
      caption: "High priority",
      accent: "HI",
    },
  ];

  const selectedRequestStatus = selectedRequest?.status ?? null;
  const canApprove =
    selectedRequestStatus !== null &&
    selectedRequestStatus !== "approved" &&
    selectedRequestStatus !== "rejected";
  const canReject =
    selectedRequestStatus !== null &&
    selectedRequestStatus !== "approved" &&
    selectedRequestStatus !== "rejected";
  const canMarkUnderReview =
    selectedRequestStatus !== null &&
    selectedRequestStatus !== "under_review" &&
    selectedRequestStatus !== "approved" &&
    selectedRequestStatus !== "rejected";

  async function handleDecision(action: "approve" | "reject" | "review") {
    if (!selectedRequest) {
      return;
    }

    const trimmedNotes = decisionNotes.trim();

    if (action === "reject" && trimmedNotes.length === 0) {
      setDecisionError("A rejection reason is required.");
      setDecisionSuccess(null);
      return;
    }

    try {
      setIsDecisionSaving(true);
      setDecisionError(null);
      setDecisionSuccess(null);

      if (action === "approve") {
        await approvePendingRequest(selectedRequest.requestId, trimmedNotes);
        setDecisionSuccess("Request approved successfully.");
      } else if (action === "reject") {
        await rejectPendingRequest(selectedRequest.requestId, trimmedNotes);
        setDecisionSuccess("Request rejected successfully.");
      } else {
        await markPendingRequestUnderReview(
          selectedRequest.requestId,
          trimmedNotes,
        );
        setDecisionSuccess("Request moved to under review.");
      }

      await loadRequests(selectedRequest.requestId);
    } catch (decisionLoadError) {
      setDecisionError(
        decisionLoadError instanceof Error
          ? decisionLoadError.message
          : "Failed to update the request.",
      );
    } finally {
      setIsDecisionSaving(false);
    }
  }

  return (
    <>
      <section className="dashboard-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Requests</p>
            <h1 className="page-title">Pending Requests</h1>
            <p className="page-subtitle">Requests from ads and matches.</p>
            <p className="dashboard-context-pill">{session.displayName}</p>
          </div>
        </header>

        {isLoading ? (
          <section className="card loading-card">
            <p>Loading pending requests...</p>
          </section>
        ) : error ? (
          <section className="card error-card">
            <h2>Requests unavailable</h2>
            <p>{error}</p>
          </section>
        ) : (
          <>
            <section
              className="summary-grid"
              aria-label="Pending requests summary"
            >
              {summaryCards.map((card, index) => (
                <article className="card metric-card" key={card.label}>
                  <div
                    className={`metric-icon metric-icon--${
                      ["primary", "success", "warning", "danger"][index] ??
                      "primary"
                    }`}
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

            <section className="card pending-requests-card">
              <div className="pending-requests-toolbar">
                <div>
                  <h2 className="section-title">Incoming Request Queue</h2>
                  <p className="section-subtitle">Select a request to review.</p>
                </div>

                <div className="pending-requests-toolbar__controls">
                  <label className="search-field">
                    <span className="search-field__icon" aria-hidden="true">
                      Search
                    </span>
                    <input
                      className="input"
                      type="search"
                      placeholder="Search borrower, purpose, region, urgency"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                    />
                  </label>

                  <label className="pending-requests-select">
                    <span>Status</span>
                    <select
                      className="pending-requests-select__control"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option === "all"
                            ? "All statuses"
                            : formatLabel(option)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Borrower</th>
                      <th>Purpose</th>
                      <th>Offer Need</th>
                      <th>Urgency</th>
                      <th>Channel</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length > 0 ? (
                      filteredRequests.map((request) => (
                        <tr
                          key={request.requestId}
                          className="dashboard-table__row"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <td>
                            <div className="borrower-cell">
                              <span
                                className="borrower-avatar"
                                aria-hidden="true"
                              >
                                {request.borrowerName.slice(0, 2).toUpperCase()}
                              </span>
                              <div>
                                <p className="borrower-name">
                                  {request.borrowerName}
                                </p>
                                <p className="borrower-email">
                                  {request.borrowerEmail}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="dashboard-table__stack">
                              <span>{request.purpose}</span>
                              <span className="dashboard-table__subcopy">
                                {formatLabel(request.purposeCategory)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="dashboard-table__stack">
                              <span>{formatCurrency(request.amount)}</span>
                              <span className="dashboard-table__subcopy">
                                {request.tenureMonths} months at{" "}
                                {request.suggestedInterestRate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`badge ${getUrgencyBadgeClass(request.urgency)}`}
                            >
                              {formatLabel(request.urgency)}
                            </span>
                          </td>
                          <td>
                            <div className="dashboard-table__stack">
                              <span>{formatLabel(request.targetType)}</span>
                              <span className="dashboard-table__subcopy">
                                {request.adTitle ?? request.requestedRegion}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`badge ${getStatusBadgeClass(request.status)}`}
                            >
                              {formatLabel(request.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="table-empty" colSpan={6}>
                          {searchQuery || statusFilter !== "all"
                            ? "No pending requests match the current filters."
                            : "No pending requests are available for this lender yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </section>

      {selectedRequest ? (
        <div
          className="borrower-modal__backdrop"
          role="presentation"
          onClick={() => setSelectedRequest(null)}
        >
          <section
            className="borrower-modal pending-request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pending-request-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="borrower-modal__header">
              <div>
                <p className="eyebrow">Request details</p>
                <h2 className="section-title" id="pending-request-title">
                  {selectedRequest.borrowerName}
                </h2>
                <p className="section-subtitle">Borrower and request details.</p>
              </div>
              <button
                type="button"
                className="borrower-modal__close"
                aria-label="Close request details"
                onClick={() => setSelectedRequest(null)}
              >
                X
              </button>
            </div>

            <div className="borrower-modal__body">
              <div className="borrower-modal__content">
                <div className="borrower-modal__grid">
                  {[
                    { label: "Request ID", value: selectedRequest.requestId },
                    { label: "Borrower ID", value: selectedRequest.borrowerId },
                    { label: "Email", value: selectedRequest.borrowerEmail },
                    {
                      label: "Phone",
                      value: selectedRequest.borrowerPhone ?? "Not available",
                    },
                    {
                      label: "Credit Score",
                      value:
                        selectedRequest.borrowerCreditScore !== null
                          ? String(selectedRequest.borrowerCreditScore)
                          : "Not available",
                    },
                    {
                      label: "Borrower KYC",
                      value: formatLabel(selectedRequest.borrowerKycStatus),
                    },
                    {
                      label: "Requested Amount",
                      value: formatCurrency(selectedRequest.amount),
                    },
                    {
                      label: "Tenure",
                      value: `${selectedRequest.tenureMonths} months`,
                    },
                    {
                      label: "Suggested Interest",
                      value: `${selectedRequest.suggestedInterestRate.toFixed(1)}%`,
                    },
                    {
                      label: "Urgency",
                      value: formatLabel(selectedRequest.urgency),
                    },
                    {
                      label: "Monthly Income",
                      value: formatCurrency(selectedRequest.monthlyIncome),
                    },
                    {
                      label: "Income Source",
                      value: formatLabel(selectedRequest.incomeSource),
                    },
                    {
                      label: "Requested Region",
                      value: selectedRequest.requestedRegion,
                    },
                    {
                      label: "Collateral Offered",
                      value: selectedRequest.collateralOffered ? "Yes" : "No",
                    },
                    {
                      label: "Channel",
                      value: formatLabel(selectedRequest.targetType),
                    },
                    {
                      label: "Linked Ad",
                      value:
                        selectedRequest.adTitle ??
                        selectedRequest.adId ??
                        "Marketplace request",
                    },
                    {
                      label: "Status",
                      value: formatLabel(selectedRequest.status),
                    },
                    { label: "Purpose", value: selectedRequest.purpose },
                    {
                      label: "Purpose Category",
                      value: formatLabel(selectedRequest.purposeCategory),
                    },
                    {
                      label: "Created",
                      value: formatDate(selectedRequest.createdAt),
                    },
                    {
                      label: "Last Updated",
                      value: formatDate(selectedRequest.updatedAt),
                    },
                  ].map((field) => (
                    <article className="borrower-detail-card" key={field.label}>
                      <p className="borrower-detail-card__label">
                        {field.label}
                      </p>
                      <p className="borrower-detail-card__value">
                        {field.value}
                      </p>
                    </article>
                  ))}
                </div>

                <section className="pending-request-notes-section">
                  <article className="borrower-loan-card">
                    <div className="borrower-loan-card__header">
                      <div>
                        <p className="borrower-loan-card__eyebrow">
                          Borrower note
                        </p>
                        <h4 className="borrower-loan-card__title">
                          Request context
                        </h4>
                      </div>
                    </div>
                    <p className="pending-request-notes">
                      {selectedRequest.notes || "No note added."}
                    </p>
                  </article>

                  <article className="borrower-loan-card">
                    <div className="borrower-loan-card__header">
                      <div>
                        <p className="borrower-loan-card__eyebrow">Routing</p>
                        <h4 className="borrower-loan-card__title">
                          Lender matching details
                        </h4>
                      </div>
                    </div>
                    <p className="pending-request-notes">
                      {selectedRequest.adTitle ??
                        selectedRequest.adId ??
                        formatLabel(selectedRequest.targetType)}
                    </p>
                  </article>
                </section>

                <section className="pending-request-decision-card">
                  <div className="pending-request-decision-card__header">
                    <div>
                      <p className="borrower-loan-card__eyebrow">
                        Lender decision
                      </p>
                      <h4 className="borrower-loan-card__title">
                        Update status
                      </h4>
                    </div>
                    <span
                      className={`badge ${getStatusBadgeClass(selectedRequest.status)}`}
                    >
                      {formatLabel(selectedRequest.status)}
                    </span>
                  </div>

                  <label className="pending-request-decision-card__field">
                    <span>
                      {selectedRequest.status === "rejected"
                        ? "Rejection reason"
                        : "Decision note"}
                    </span>
                    <textarea
                      className="input pending-request-decision-card__textarea"
                      rows={4}
                      placeholder="Add a note. Rejection requires a reason."
                      value={decisionNotes}
                      onChange={(event) => setDecisionNotes(event.target.value)}
                      disabled={isDecisionSaving}
                    />
                  </label>

                  {decisionError ? (
                    <p className="auth-error">{decisionError}</p>
                  ) : null}
                  {decisionSuccess ? (
                    <p className="pending-request-decision-card__success">
                      {decisionSuccess}
                    </p>
                  ) : null}

                  <div className="pending-request-decision-card__actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => void handleDecision("review")}
                      disabled={!canMarkUnderReview || isDecisionSaving}
                    >
                      Mark Under Review
                    </button>
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => void handleDecision("approve")}
                      disabled={!canApprove || isDecisionSaving}
                    >
                      Approve Request
                    </button>
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() => void handleDecision("reject")}
                      disabled={!canReject || isDecisionSaving}
                    >
                      Reject Request
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
