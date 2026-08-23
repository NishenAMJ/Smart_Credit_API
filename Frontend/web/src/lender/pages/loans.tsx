import { useEffect, useMemo, useState } from "react";
import { Banknote, CircleCheckBig, Landmark, Wallet } from "lucide-react";
import BorrowerSidePanel from "../components/borrowers/BorrowerSidePanel";
import LoanDetailsModal from "../components/loans/LoanDetailsModal";
import LoanPortfolioCard from "../components/loans/LoanPortfolioCard";
import type { LenderSession } from "../lib/lender-session";
import {
  fetchLenderLoans,
  type LenderLoansResponse,
} from "../lib/lender-loans-api";

const PAGE_SIZE = 15;

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export default function LoansPage({
  session,
  onOpenAgreement,
}: {
  session: LenderSession;
  onOpenAgreement?: (loanId: string) => void;
}) {
  const [response, setResponse] = useState<LenderLoansResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [selectedLoan, setSelectedLoan] = useState<{
    loanId: string;
    borrowerName: string;
    showPayments: boolean;
  } | null>(null);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(
    null,
  );
  const activeCursor = pageCursors[currentPage - 1] ?? null;

  useEffect(() => {
    setCurrentPage(1);
    setPageCursors([null]);
  }, [statusFilter, search, session.lenderId]);

  useEffect(() => {
    let isMounted = true;

    async function loadLoans() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchLenderLoans({
          pageSize: PAGE_SIZE,
          cursor: activeCursor,
          status: statusFilter,
          search,
        });

        if (!isMounted) return;
        setResponse(data);

        if (data.pageInfo.nextCursor) {
          setPageCursors((current) => {
            if (current[currentPage] === data.pageInfo.nextCursor)
              return current;
            return [...current.slice(0, currentPage), data.pageInfo.nextCursor];
          });
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load lender loans.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadLoans();
    return () => {
      isMounted = false;
    };
  }, [
    activeCursor,
    currentPage,
    reloadVersion,
    search,
    statusFilter,
    session.lenderId,
  ]);

  const summaryCards = useMemo(() => {
    const summary = response?.summary;
    return [
      {
        label: "Total Loans",
        value: summary ? String(summary.totalLoans) : "--",
        icon: Landmark,
      },
      {
        label: "Active Loans",
        value: summary ? String(summary.activeLoans) : "--",
        icon: CircleCheckBig,
      },
      {
        label: "Outstanding",
        value: summary ? formatCurrency(summary.outstandingBalance) : "--",
        icon: Wallet,
      },
      {
        label: "Total Principal",
        value: summary ? formatCurrency(summary.totalPrincipal) : "--",
        icon: Banknote,
      },
    ];
  }, [response?.summary]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <>
      <section className="dashboard-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Lender portfolio</p>
            <h1 className="page-title">Loans</h1>
            <p className="page-subtitle">
              Review every loan owned by {session.displayName}, its borrower,
              balance, terms, and monthly installment progress.
            </p>
          </div>
        </header>

        <section className="summary-grid" aria-label="Loan summary">
          {summaryCards.map((card, index) => (
            <article className="card metric-card" key={card.label}>
              <div
                className={`metric-icon metric-icon--${["primary", "success", "warning", "danger"][index]}`}
              >
                <card.icon size={22} strokeWidth={1.8} />
              </div>
              <div className="metric-copy">
                <p className="metric-label">{card.label}</p>
                <p className="metric-value">{card.value}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="card borrowers-card">
          <div className="borrowers-toolbar">
            <div>
              <h2 className="section-title">Loan Portfolio</h2>
              <p className="section-subtitle">
                Loans are loaded only for the authenticated lender account.
              </p>
            </div>

            <form className="lender-loans-filters" onSubmit={submitSearch}>
              <select
                className="input"
                aria-label="Filter loans by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="pending_disbursement">
                  Pending disbursement
                </option>
                <option value="active">Active</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
                <option value="defaulted">Defaulted</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <input
                className="input"
                type="search"
                placeholder="Search borrower names"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <button className="pagination-button" type="submit">
                Search
              </button>
            </form>
          </div>

          {isLoading ? (
            <div className="table-empty">Loading loans...</div>
          ) : error ? (
            <div className="table-empty">{error}</div>
          ) : response?.loans.length ? (
            <div className="portfolio-loan-grid">
              {response.loans.map((loan) => (
                <LoanPortfolioCard
                  key={loan.id}
                  borrowerName={loan.borrower.fullName}
                  status={loan.status}
                  principal={loan.principal}
                  remaining={loan.remainingBalance}
                  monthlyInstallment={loan.monthlyInstallment}
                  onOpen={() =>
                    setSelectedLoan({
                      loanId: loan.id,
                      borrowerName: loan.borrower.fullName,
                      showPayments: false,
                    })
                  }
                  onOpenBorrower={() => setSelectedBorrowerId(loan.borrower.id)}
                />
              ))}
            </div>
          ) : (
            <div className="table-empty">No loans match this view.</div>
          )}

          <div className="table-footer">
            <p>Page {currentPage}</p>
            <div className="pagination">
              <button
                className="pagination-button"
                type="button"
                disabled={currentPage === 1 || isLoading}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <button
                className="pagination-button"
                type="button"
                disabled={!response?.pageInfo.hasMore || isLoading}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </section>

      {selectedLoan ? (
        <LoanDetailsModal
          key={`${selectedLoan.loanId}-${selectedLoan.showPayments}`}
          lenderId={session.lenderId}
          loanId={selectedLoan.loanId}
          borrowerName={selectedLoan.borrowerName}
          initialShowPayments={selectedLoan.showPayments}
          onPaymentRecorded={() => setReloadVersion((version) => version + 1)}
          onOpenAgreement={onOpenAgreement}
          onClose={() => setSelectedLoan(null)}
        />
      ) : null}

      {selectedBorrowerId ? (
        <BorrowerSidePanel
          session={session}
          borrowerId={selectedBorrowerId}
          onOpenAgreement={onOpenAgreement}
          onClose={() => setSelectedBorrowerId(null)}
        />
      ) : null}
    </>
  );
}
