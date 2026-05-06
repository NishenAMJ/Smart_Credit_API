import { useEffect, useMemo, useState } from "react";
import {
  fetchBorrowerDetails,
  type BorrowerDetails,
} from "../lib/dashboard-api";
import type { LenderSession } from "../lib/lender-session";
import {
  fetchLoanLedgerDetails,
  type LoanLedgerDetailsResponse,
  fetchPayments,
  recordInstallmentPayment,
  type PaymentItem,
  type PaymentsResponse,
} from "../lib/payments-api";

type PaymentsPageProps = {
  session: LenderSession;
};

type DetailSection = "loan" | "borrower";

type PaymentFormState = {
  installmentId: string | null;
  amount: string;
  paidAt: string;
  note: string;
  error: string | null;
  success: string | null;
  isSaving: boolean;
};

const PAGE_SIZE = 15;

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

function getStatusBadgeClass(value: string): string {
  if (value === "overdue" || value === "defaulted" || value === "failed") {
    return "badge-danger";
  }

  if (value === "paid" || value === "completed" || value === "repayment") {
    return "badge-success";
  }

  return "badge-gray";
}

export default function PaymentsPage({
  session,
}: PaymentsPageProps) {
  const [response, setResponse] = useState<PaymentsResponse | null>(
    null,
  );
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summary, setSummary] = useState<
    PaymentsResponse["summary"] | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [selectedTransaction, setSelectedTransaction] =
    useState<PaymentItem | null>(null);
  const [detailSection, setDetailSection] = useState<DetailSection>("loan");
  const [borrowerDetails, setBorrowerDetails] =
    useState<BorrowerDetails | null>(null);
  const [loanDetails, setLoanDetails] =
    useState<LoanLedgerDetailsResponse | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    installmentId: null,
    amount: "",
    paidAt: new Date().toISOString().slice(0, 10),
    note: "",
    error: null,
    success: null,
    isSaving: false,
  });

  const activeCursor = pageCursors[currentPage - 1] ?? null;

  async function loadTransactionsData(options?: {
    cursor?: string | null;
    search?: string;
  }) {
    setIsListLoading(true);
    setListError(null);

    try {
      const normalizedSearch = options?.search ?? debouncedSearchQuery;
      const data = await fetchPayments({
        pageSize: PAGE_SIZE,
        cursor: options?.cursor ?? activeCursor,
        includeSummary: false,
        includeSearchCount: normalizedSearch.trim().length > 0,
        search: normalizedSearch,
      });
      setResponse(data);
    } catch (loadError) {
      setListError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load payments.",
      );
    } finally {
      setIsListLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPage(1);
    setPageCursors([null]);
    setResponse(null);
    setSummary(null);
    setSearchQuery("");
    setDebouncedSearchQuery("");
  }, [session.lenderId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
    setPageCursors([null]);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    let isMounted = true;

    const loadTransactions = async () => {
      try {
        setIsListLoading(true);
        setListError(null);

        const data = await fetchPayments({
          pageSize: PAGE_SIZE,
          cursor: activeCursor,
          includeSummary: false,
          includeSearchCount: debouncedSearchQuery.trim().length > 0,
          search: debouncedSearchQuery,
        });

        if (isMounted) {
          setResponse(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setListError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load payments.",
          );
        }
      } finally {
        if (isMounted) {
          setIsListLoading(false);
        }
      }
    };

    void loadTransactions();

    return () => {
      isMounted = false;
    };
  }, [activeCursor, currentPage, debouncedSearchQuery, session.lenderId]);

  useEffect(() => {
    if (!response || summary) {
      return;
    }

    let isMounted = true;

    const loadSummary = async () => {
      try {
        setIsSummaryLoading(true);
        setSummaryError(null);

        const data = await fetchPayments({
          pageSize: PAGE_SIZE,
          includeSummary: true,
          includeSearchCount: false,
        });

        if (isMounted) {
          setSummary(data.summary);
        }
      } catch (loadError) {
        if (isMounted) {
          setSummaryError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load payments summary.",
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
  }, [response, session.lenderId, summary]);

  useEffect(() => {
    if (!selectedTransaction) {
      return;
    }

    let isMounted = true;

    const loadDetails = async () => {
      try {
        setIsDetailLoading(true);
        setDetailError(null);

        const [borrowerData, loanData] = await Promise.all([
          fetchBorrowerDetails(selectedTransaction.borrowerId),
          fetchLoanLedgerDetails(selectedTransaction.loanId),
        ]);

        if (isMounted) {
          setBorrowerDetails(borrowerData);
          setLoanDetails(loanData);
        }
      } catch (loadError) {
        if (isMounted) {
          setDetailError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load loan activity details.",
          );
        }
      } finally {
        if (isMounted) {
          setIsDetailLoading(false);
        }
      }
    };

    void loadDetails();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedTransaction(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      isMounted = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedTransaction, session.lenderId]);

  function openLoanSection(transaction: PaymentItem) {
    setSelectedTransaction(transaction);
    setDetailSection("loan");
    setBorrowerDetails(null);
    setLoanDetails(null);
    setDetailError(null);
    setPaymentForm({
      installmentId: null,
      amount: "",
      paidAt: new Date().toISOString().slice(0, 10),
      note: "",
      error: null,
      success: null,
      isSaving: false,
    });
  }

  function openBorrowerSection(transaction: PaymentItem) {
    setSelectedTransaction(transaction);
    setDetailSection("borrower");
    setBorrowerDetails(null);
    setLoanDetails(null);
    setDetailError(null);
  }

  function openPaymentForm(installmentId: string) {
    setPaymentForm({
      installmentId,
      amount: "",
      paidAt: new Date().toISOString().slice(0, 10),
      note: "",
      error: null,
      success: null,
      isSaving: false,
    });
  }

  async function handleRecordPayment(installmentId: string) {
    if (!selectedTransaction) {
      return;
    }

    const amount = Number(paymentForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentForm((current) => ({
        ...current,
        error: "Enter a valid payment amount greater than zero.",
        success: null,
      }));
      return;
    }

    try {
      setPaymentForm((current) => ({
        ...current,
        isSaving: true,
        error: null,
        success: null,
      }));

      const updatedLoanDetails = await recordInstallmentPayment(
        selectedTransaction.loanId,
        installmentId,
        {
          amount,
          paidAt: paymentForm.paidAt,
          note: paymentForm.note,
        },
      );

      setLoanDetails(updatedLoanDetails);
      setPaymentForm({
        installmentId: null,
        amount: "",
        paidAt: new Date().toISOString().slice(0, 10),
        note: "",
        error: null,
        success: "Payment recorded successfully.",
        isSaving: false,
      });
      setCurrentPage(1);
      setPageCursors([null]);
      await loadTransactionsData({
        cursor: null,
        search: debouncedSearchQuery,
      });
      try {
        setIsSummaryLoading(true);
        setSummaryError(null);
        const summaryData = await fetchPayments({
          pageSize: PAGE_SIZE,
          includeSummary: true,
          includeSearchCount: false,
        });
        setSummary(summaryData.summary);
      } catch (loadError) {
        setSummaryError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load payments summary.",
        );
      } finally {
        setIsSummaryLoading(false);
      }
    } catch (saveError) {
      setPaymentForm((current) => ({
        ...current,
        isSaving: false,
        error:
          saveError instanceof Error
            ? saveError.message
            : "Failed to record payment.",
        success: null,
      }));
    }
  }

  const transactions = useMemo(
    () => response?.transactions ?? [],
    [response?.transactions],
  );

  const visibleStart = response?.transactions.length
    ? (currentPage - 1) * PAGE_SIZE + 1
    : 0;
  const visibleEnd = response?.transactions.length
    ? visibleStart + response.transactions.length - 1
    : 0;
  const isSearchActive = debouncedSearchQuery.trim().length > 0;
  const matchedPaymentsCount =
    response?.searchResultCount ?? (isSearchActive ? transactions.length : 0);
  const displaySummary = summary ?? {
    totalTransactions: 0,
    totalCollected: 0,
    loansWithActivity: 0,
    overdueInstallments: 0,
  };

  function goToPreviousPage() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goToNextPage() {
    const nextCursor = response?.pageInfo.nextCursor;

    if (!nextCursor) {
      return;
    }

    setPageCursors((current) => {
      if (current[currentPage] === nextCursor) {
        return current;
      }

      return [...current.slice(0, currentPage), nextCursor];
    });
    setCurrentPage((page) => page + 1);
  }

  return (
    <>
      <section className="dashboard-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Payments</p>
            <h1 className="page-title">Payments</h1>
            <p className="page-subtitle">Payments, balances, and installments.</p>
            <p className="dashboard-context-pill">{session.displayName}</p>
          </div>
        </header>

        {isListLoading && !response ? (
          <section className="card loading-card">
            <p>Loading loan activity ledger...</p>
          </section>
        ) : listError && !response ? (
          <section className="card error-card">
            <h2>Payments unavailable</h2>
            <p>{listError}</p>
          </section>
        ) : (
          <>
            <section
              className="summary-grid"
              aria-label="Loan activity summary"
            >
              <article className="card metric-card">
                <div
                  className="metric-icon metric-icon--primary"
                  aria-hidden="true"
                >
                  PM
                </div>
                <div className="metric-copy">
                  <p className="metric-label">Total Payments</p>
                  <p className="metric-value">
                    {isSummaryLoading
                      ? "..."
                      : String(displaySummary.totalTransactions)}
                  </p>
                  <p className="metric-caption">
                    {summaryError ?? "Recorded payments"}
                  </p>
                </div>
              </article>
              <article className="card metric-card">
                <div
                  className="metric-icon metric-icon--success"
                  aria-hidden="true"
                >
                  LKR
                </div>
                <div className="metric-copy">
                  <p className="metric-label">Total Collected</p>
                  <p className="metric-value">
                    {isSummaryLoading
                      ? "..."
                      : formatCurrency(displaySummary.totalCollected)}
                  </p>
                  <p className="metric-caption">Collected amount</p>
                </div>
              </article>
              <article className="card metric-card">
                <div
                  className="metric-icon metric-icon--warning"
                  aria-hidden="true"
                >
                  LN
                </div>
                <div className="metric-copy">
                  <p className="metric-label">Loans With Activity</p>
                  <p className="metric-value">
                    {isSummaryLoading
                      ? "..."
                      : String(displaySummary.loansWithActivity)}
                  </p>
                  <p className="metric-caption">Loans with payments</p>
                </div>
              </article>
              <article className="card metric-card">
                <div
                  className="metric-icon metric-icon--danger"
                  aria-hidden="true"
                >
                  OD
                </div>
                <div className="metric-copy">
                  <p className="metric-label">Overdue Installments</p>
                  <p className="metric-value">
                    {isSummaryLoading
                      ? "..."
                      : String(displaySummary.overdueInstallments)}
                  </p>
                  <p className="metric-caption">Overdue installments</p>
                </div>
              </article>
            </section>

            <section className="card pending-requests-card">
              <div className="borrowers-toolbar">
                <div>
                  <h2 className="section-title">Loan Activity Ledger</h2>
                  <p className="section-subtitle">
                    Recent payment activity.
                  </p>
                </div>

                <label className="search-field">
                  <span className="search-field__icon" aria-hidden="true">
                    Search
                  </span>
                  <input
                    className="input"
                    type="search"
                    placeholder="Search borrower, email, loan id, installment, status"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </label>
              </div>

              {isSearchActive ? (
                <section
                  className="summary-grid"
                  aria-label="Loan search summary"
                >
                  <article className="card metric-card">
                    <div
                      className="metric-icon metric-icon--primary"
                      aria-hidden="true"
                    >
                      PM
                    </div>
                    <div className="metric-copy">
                      <p className="metric-label">Total Payments</p>
                      <p className="metric-value">
                        {isListLoading ? "..." : String(matchedPaymentsCount)}
                      </p>
                      <p className="metric-caption">
                        Matched payment rows
                      </p>
                    </div>
                  </article>
                </section>
              ) : null}

              <div className="table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Borrower</th>
                      <th>Loan</th>
                      <th>Payment</th>
                      <th>Remaining</th>
                      <th>Installments</th>
                      <th>Next Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isListLoading ? (
                      <tr>
                        <td className="table-empty" colSpan={6}>
                          Loading payment activity...
                        </td>
                      </tr>
                    ) : listError ? (
                      <tr>
                        <td className="table-empty" colSpan={6}>
                          {listError}
                        </td>
                      </tr>
                    ) : transactions.length > 0 ? (
                      transactions.map((transaction) => (
                        <tr
                          key={transaction.transactionId}
                          className="dashboard-table__row"
                          onClick={() => openLoanSection(transaction)}
                        >
                          <td>
                            <div className="borrower-cell">
                              <span
                                className="borrower-avatar"
                                aria-hidden="true"
                              >
                                {transaction.borrowerName
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                              <div>
                                <button
                                  type="button"
                                  className="borrower-name borrower-name--button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openBorrowerSection(transaction);
                                  }}
                                >
                                  {transaction.borrowerName}
                                </button>
                                <p className="borrower-email">
                                  {transaction.borrowerEmail}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="dashboard-table__stack">
                              <span>{transaction.loanId}</span>
                              <span className="dashboard-table__subcopy">
                                {formatLabel(transaction.loanStatus)}
                                {transaction.installmentId
                                  ? ` · ${transaction.installmentId}`
                                  : ""}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="dashboard-table__stack">
                              <span>{formatCurrency(transaction.amount)}</span>
                              <span className="dashboard-table__subcopy">
                                {formatDate(transaction.createdAt)} ·{" "}
                                {transaction.source === "payment"
                                  ? "Payment record"
                                  : "Transaction record"}
                              </span>
                            </div>
                          </td>
                          <td>{formatCurrency(transaction.remainingAmount)}</td>
                          <td>
                            <div className="dashboard-table__stack">
                              <span>
                                {
                                  transaction.installmentSummary
                                    .paidInstallments
                                }
                                /
                                {
                                  transaction.installmentSummary
                                    .totalInstallments
                                }{" "}
                                paid
                              </span>
                              <span
                                className={`badge ${getStatusBadgeClass(
                                  transaction.installmentSummary
                                    .latestInstallmentStatus,
                                )}`}
                              >
                                {formatLabel(
                                  transaction.installmentSummary
                                    .latestInstallmentStatus,
                                )}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="dashboard-table__stack">
                              <span>
                                {formatDate(
                                  transaction.installmentSummary.nextDueDate,
                                )}
                              </span>
                              <span className="dashboard-table__subcopy">
                                {
                                  transaction.installmentSummary
                                    .overdueInstallments
                                }{" "}
                                overdue
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="table-empty" colSpan={6}>
                          {searchQuery
                            ? "No payments matched your search."
                            : "No payment activity found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <p>
                  {isSearchActive
                    ? `Showing ${visibleStart}-${visibleEnd} of ${matchedPaymentsCount} matched payments on page ${currentPage}.`
                    : `Showing ${visibleStart}-${visibleEnd} payments on page ${currentPage}.`}
                </p>

                <div className="pagination">
                  <button
                    type="button"
                    className="pagination-button"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1 || isListLoading}
                  >
                    Previous
                  </button>

                  <span className="pagination-status">Page {currentPage}</span>

                  <button
                    type="button"
                    className="pagination-button"
                    onClick={goToNextPage}
                    disabled={!response?.pageInfo.hasMore || isListLoading}
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </section>

      {selectedTransaction ? (
        <div
          className="borrower-modal__backdrop"
          role="presentation"
          onClick={() => setSelectedTransaction(null)}
        >
          <section
            className="borrower-modal pending-request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recent-transaction-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="borrower-modal__header">
              <div>
                <p className="eyebrow">Loan activity details</p>
                <h2 className="section-title" id="recent-transaction-title">
                  {selectedTransaction.borrowerName}
                </h2>
                <p className="section-subtitle">
                  Switch between the lender-owned loan ledger and the borrower
                  profile without leaving this page.
                </p>
              </div>
              <button
                type="button"
                className="borrower-modal__close"
                aria-label="Close transaction details"
                onClick={() => setSelectedTransaction(null)}
              >
                X
              </button>
            </div>

            <div className="borrower-modal__body">
              <div
                className="analytics-range-tabs"
                role="tablist"
                aria-label="Loan detail sections"
              >
                <button
                  type="button"
                  className={`analytics-range-tab${
                    detailSection === "loan"
                      ? " analytics-range-tab--active"
                      : ""
                  }`}
                  role="tab"
                  aria-selected={detailSection === "loan"}
                  onClick={() => setDetailSection("loan")}
                >
                  Loan, Installments, Payments
                </button>
                <button
                  type="button"
                  className={`analytics-range-tab${
                    detailSection === "borrower"
                      ? " analytics-range-tab--active"
                      : ""
                  }`}
                  role="tab"
                  aria-selected={detailSection === "borrower"}
                  onClick={() => setDetailSection("borrower")}
                >
                  Borrower Details
                </button>
              </div>

              <div className="borrower-modal__content">
                {isDetailLoading ? (
                  <div className="borrower-modal__state">
                    Loading loan activity details...
                  </div>
                ) : detailError ? (
                  <div className="borrower-modal__state borrower-modal__state--error">
                    {detailError}
                  </div>
                ) : detailSection === "loan" ? (
                  <div className="borrower-modal__content">
                    <div className="borrower-modal__grid">
                      {[
                        {
                          label: "Ledger Entry ID",
                          value: selectedTransaction.transactionId,
                        },
                        { label: "Loan ID", value: selectedTransaction.loanId },
                        {
                          label: "Installment ID",
                          value:
                            selectedTransaction.installmentId ?? "Not linked",
                        },
                        {
                          label: "Loan Status",
                          value: formatLabel(selectedTransaction.loanStatus),
                        },
                        {
                          label: "Loan Amount",
                          value: formatCurrency(loanDetails?.loan.amount ?? 0),
                        },
                        {
                          label: "Remaining Amount",
                          value: formatCurrency(
                            loanDetails?.loan.remainingAmount ?? 0,
                          ),
                        },
                        {
                          label: "Interest Rate",
                          value: `${loanDetails?.loan.interestRate ?? 0}%`,
                        },
                        {
                          label: "Tenure",
                          value: `${loanDetails?.loan.tenureMonths ?? 0} months`,
                        },
                        {
                          label: "Entry Type",
                          value: formatLabel(selectedTransaction.type),
                        },
                        {
                          label: "Entry Status",
                          value: formatLabel(selectedTransaction.status),
                        },
                        {
                          label: "Amount",
                          value: formatCurrency(selectedTransaction.amount),
                        },
                        {
                          label: "Recorded On",
                          value: formatDate(selectedTransaction.createdAt),
                        },
                      ].map((field) => (
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
                            Installments and payments
                          </h3>
                          <p className="section-subtitle">
                            Full lender-owned installment record for this loan.
                          </p>
                        </div>
                      </div>

                      {paymentForm.success ? (
                        <p className="create-ad-banner create-ad-banner--primary">
                          {paymentForm.success}
                        </p>
                      ) : null}

                      <div className="borrower-loan-list">
                        {(loanDetails?.installments ?? []).length > 0 ? (
                          loanDetails?.installments.map((installment) => (
                            <article
                              className="borrower-loan-card"
                              key={installment.id}
                            >
                              <div className="borrower-loan-card__header">
                                <div>
                                  <p className="borrower-loan-card__eyebrow">
                                    Installment
                                  </p>
                                  <h4 className="borrower-loan-card__title">
                                    {installment.id}
                                  </h4>
                                </div>
                                <span
                                  className={`badge ${getStatusBadgeClass(
                                    installment.status,
                                  )}`}
                                >
                                  {formatLabel(installment.status)}
                                </span>
                              </div>

                              <div className="borrower-loan-card__grid">
                                <article className="borrower-detail-card">
                                  <p className="borrower-detail-card__label">
                                    Due Date
                                  </p>
                                  <p className="borrower-detail-card__value">
                                    {formatDate(installment.dueDate)}
                                  </p>
                                </article>
                                <article className="borrower-detail-card">
                                  <p className="borrower-detail-card__label">
                                    Installment Amount
                                  </p>
                                  <p className="borrower-detail-card__value">
                                    {formatCurrency(installment.amount)}
                                  </p>
                                </article>
                                <article className="borrower-detail-card">
                                  <p className="borrower-detail-card__label">
                                    Paid Amount
                                  </p>
                                  <p className="borrower-detail-card__value">
                                    {formatCurrency(installment.paidAmount)}
                                  </p>
                                </article>
                                <article className="borrower-detail-card">
                                  <p className="borrower-detail-card__label">
                                    Payments Count
                                  </p>
                                  <p className="borrower-detail-card__value">
                                    {String(installment.payments.length)}
                                  </p>
                                </article>
                              </div>

                              <div className="loan-ledger-actions">
                                <div className="dashboard-table__stack">
                                  <span className="borrower-detail-card__label">
                                    Outstanding for this installment
                                  </span>
                                  <span className="borrower-detail-card__value">
                                    {formatCurrency(
                                      Math.max(
                                        0,
                                        installment.amount -
                                          installment.paidAmount,
                                      ),
                                    )}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="button button-primary"
                                  disabled={
                                    installment.paidAmount >= installment.amount
                                  }
                                  onClick={() =>
                                    openPaymentForm(installment.id)
                                  }
                                >
                                  {installment.paidAmount >= installment.amount
                                    ? "Fully paid"
                                    : "Record Payment"}
                                </button>
                              </div>

                              {paymentForm.installmentId === installment.id ? (
                                <div className="loan-payment-form">
                                  <div className="create-ad-form-grid">
                                    <label className="create-ad-field">
                                      <span className="create-ad-field__label">
                                        Payment Amount
                                      </span>
                                      <input
                                        className="input"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={paymentForm.amount}
                                        onChange={(event) =>
                                          setPaymentForm((current) => ({
                                            ...current,
                                            amount: event.target.value,
                                            error: null,
                                            success: null,
                                          }))
                                        }
                                      />
                                    </label>

                                    <label className="create-ad-field">
                                      <span className="create-ad-field__label">
                                        Paid Date
                                      </span>
                                      <input
                                        className="input"
                                        type="date"
                                        value={paymentForm.paidAt}
                                        onChange={(event) =>
                                          setPaymentForm((current) => ({
                                            ...current,
                                            paidAt: event.target.value,
                                            error: null,
                                            success: null,
                                          }))
                                        }
                                      />
                                    </label>

                                    <label className="create-ad-field create-ad-field--full">
                                      <span className="create-ad-field__label">
                                        Note
                                      </span>
                                      <textarea
                                        className="create-ad-textarea"
                                        rows={3}
                                        placeholder="Optional note about this payment"
                                        value={paymentForm.note}
                                        onChange={(event) =>
                                          setPaymentForm((current) => ({
                                            ...current,
                                            note: event.target.value,
                                            error: null,
                                            success: null,
                                          }))
                                        }
                                      />
                                    </label>
                                  </div>

                                  {paymentForm.error ? (
                                    <p className="create-ad-banner create-ad-banner--error">
                                      {paymentForm.error}
                                    </p>
                                  ) : null}

                                  <div className="loan-payment-form__actions">
                                    <button
                                      type="button"
                                      className="button button-secondary"
                                      onClick={() =>
                                        setPaymentForm((current) => ({
                                          ...current,
                                          installmentId: null,
                                          error: null,
                                        }))
                                      }
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      className="button button-primary"
                                      disabled={paymentForm.isSaving}
                                      onClick={() =>
                                        void handleRecordPayment(installment.id)
                                      }
                                    >
                                      {paymentForm.isSaving
                                        ? "Saving..."
                                        : "Save Payment"}
                                    </button>
                                  </div>
                                </div>
                              ) : null}

                              <div className="loan-ledger-payments">
                                <p className="borrower-detail-card__label">
                                  Payments
                                </p>
                                {installment.payments.length > 0 ? (
                                  installment.payments.map((payment) => (
                                    <div
                                      className="loan-ledger-payment-row"
                                      key={payment.id}
                                    >
                                      <div className="dashboard-table__stack">
                                        <span>{payment.id}</span>
                                        <span className="dashboard-table__subcopy">
                                          {formatDate(payment.createdAt)} ·{" "}
                                          {payment.source === "payment"
                                            ? "Installment payment"
                                            : "Transaction fallback"}
                                        </span>
                                      </div>
                                      <div className="dashboard-table__stack">
                                        <span>
                                          {formatCurrency(payment.amount)}
                                        </span>
                                        <span className="dashboard-table__subcopy">
                                          {formatLabel(payment.type)}
                                          {payment.note
                                            ? ` · ${payment.note}`
                                            : ""}
                                        </span>
                                      </div>
                                      <span
                                        className={`badge ${getStatusBadgeClass(
                                          payment.status,
                                        )}`}
                                      >
                                        {formatLabel(payment.status)}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="section-subtitle">
                                    No payment records yet.
                                  </p>
                                )}
                              </div>
                            </article>
                          ))
                        ) : (
                          <div className="borrower-modal__state">
                            No installment details found.
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                ) : borrowerDetails ? (
                  <div className="borrower-modal__content">
                    <div className="borrower-modal__grid">
                      {[
                        { label: "Borrower ID", value: borrowerDetails.id },
                        { label: "Full Name", value: borrowerDetails.fullName },
                        { label: "Email", value: borrowerDetails.email },
                        {
                          label: "Phone",
                          value: borrowerDetails.phone ?? "Not provided",
                        },
                        {
                          label: "Address",
                          value: borrowerDetails.address ?? "Not provided",
                        },
                        {
                          label: "NIC",
                          value: borrowerDetails.nic ?? "Not provided",
                        },
                        {
                          label: "KYC Status",
                          value: formatLabel(borrowerDetails.kycStatus),
                        },
                        {
                          label: "Credit Score",
                          value:
                            borrowerDetails.creditScore !== null
                              ? String(borrowerDetails.creditScore)
                              : "Unknown",
                        },
                        {
                          label: "Rating",
                          value:
                            borrowerDetails.rating !== null
                              ? String(borrowerDetails.rating)
                              : "Unknown",
                        },
                        {
                          label: "Loan Count",
                          value: String(borrowerDetails.loanCount),
                        },
                        {
                          label: "Active Loans",
                          value: String(borrowerDetails.activeLoansCount),
                        },
                        {
                          label: "Outstanding Amount",
                          value: formatCurrency(
                            borrowerDetails.outstandingAmount,
                          ),
                        },
                      ].map((field) => (
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
                            Borrower loan summary
                          </h3>
                          <p className="section-subtitle">Loans with you.</p>
                        </div>
                      </div>

                      <div className="borrower-loan-list">
                        {borrowerDetails.loans.map((loan) => (
                          <article className="borrower-loan-card" key={loan.id}>
                            <div className="borrower-loan-card__header">
                              <div>
                                <p className="borrower-loan-card__eyebrow">
                                  Loan
                                </p>
                                <h4 className="borrower-loan-card__title">
                                  {loan.id}
                                </h4>
                              </div>
                              <span
                                className={`badge ${getStatusBadgeClass(loan.status)}`}
                              >
                                {formatLabel(loan.status)}
                              </span>
                            </div>

                            <div className="borrower-loan-card__grid">
                              <article className="borrower-detail-card">
                                <p className="borrower-detail-card__label">
                                  Amount
                                </p>
                                <p className="borrower-detail-card__value">
                                  {formatCurrency(loan.amount)}
                                </p>
                              </article>
                              <article className="borrower-detail-card">
                                <p className="borrower-detail-card__label">
                                  Remaining
                                </p>
                                <p className="borrower-detail-card__value">
                                  {formatCurrency(loan.remainingAmount)}
                                </p>
                              </article>
                              <article className="borrower-detail-card">
                                <p className="borrower-detail-card__label">
                                  Interest Rate
                                </p>
                                <p className="borrower-detail-card__value">
                                  {loan.interestRate}%
                                </p>
                              </article>
                              <article className="borrower-detail-card">
                                <p className="borrower-detail-card__label">
                                  Tenure
                                </p>
                                <p className="borrower-detail-card__value">
                                  {loan.tenureMonths} months
                                </p>
                              </article>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="borrower-modal__state">
                    Borrower details unavailable.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
