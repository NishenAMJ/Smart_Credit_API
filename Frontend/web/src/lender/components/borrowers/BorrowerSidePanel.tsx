import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, UserRound, X } from "lucide-react";
import LoanDetailsModal from "../loans/LoanDetailsModal";
import LoanPortfolioCard from "../loans/LoanPortfolioCard";
import {
  fetchBorrowerDetails,
  type BorrowerDetails,
  type BorrowerLoan,
} from "../../lib/dashboard-api";
import type { LenderSession } from "../../lib/lender-session";

type BorrowerSidePanelProps = {
  session: LenderSession;
  borrowerId: string;
  onClose: () => void;
  onOpenLoan?: (loanId: string) => void;
  onOpenAgreement?: (loanId: string) => void;
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
  if (!value) return "Not available";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat("en-LK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(parsed);
}

export default function BorrowerSidePanel({
  session,
  borrowerId,
  onClose,
  onOpenLoan,
  onOpenAgreement,
}: BorrowerSidePanelProps) {
  const [borrower, setBorrower] = useState<BorrowerDetails | null>(null);
  const [view, setView] = useState<"loans" | "profile">("loans");
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadBorrower = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setBorrower(null);
        setView("loans");
        const details = await fetchBorrowerDetails(
          session.lenderId,
          borrowerId,
        );
        if (isMounted) setBorrower(details);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load borrower details.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadBorrower();
    return () => {
      isMounted = false;
    };
  }, [borrowerId, session.lenderId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || selectedLoanId) return;
      if (view === "profile") {
        setView("loans");
      } else {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, selectedLoanId, view]);

  const openLoan = (loan: BorrowerLoan) => {
    if (onOpenLoan) {
      onOpenLoan(loan.id);
      return;
    }
    setSelectedLoanId(loan.id);
  };

  return (
    <>
      <div
        className="borrower-panel-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <aside
          className="borrower-side-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="borrower-side-panel-title"
        >
          <header className="borrower-side-panel__header">
            <div>
              {view === "profile" ? (
                <button
                  type="button"
                  className="borrower-side-panel__back"
                  onClick={() => setView("loans")}
                >
                  <ArrowLeft size={16} /> Loans
                </button>
              ) : (
                <p className="eyebrow">Borrower portfolio</p>
              )}
              <h2 id="borrower-side-panel-title">
                {borrower?.fullName ?? "Borrower"}
              </h2>
            </div>
            <button
              type="button"
              className="borrower-side-panel__close"
              aria-label="Close borrower panel"
              autoFocus
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </header>

          <div className="borrower-side-panel__body">
            {isLoading ? (
              <div className="borrower-panel-state">Loading borrower...</div>
            ) : error || !borrower ? (
              <div className="borrower-panel-state borrower-panel-state--error">
                {error ?? "Borrower details are unavailable."}
              </div>
            ) : view === "profile" ? (
              <section className="borrower-panel-profile">
                <div className="borrower-panel-profile__identity">
                  <span aria-hidden="true">
                    {borrower.fullName.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h3>{borrower.fullName}</h3>
                    <p>
                      {borrower.isActive
                        ? "Active account"
                        : "Inactive account"}
                    </p>
                  </div>
                </div>

                <dl className="borrower-panel-profile__details">
                  <div>
                    <dt>Phone</dt>
                    <dd>{borrower.phone ?? "Not available"}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{borrower.email || "Not available"}</dd>
                  </div>
                  <div>
                    <dt>Address</dt>
                    <dd>{borrower.address ?? "Not available"}</dd>
                  </div>
                  <div>
                    <dt>NIC</dt>
                    <dd>{borrower.nic ?? "Not available"}</dd>
                  </div>
                  <div>
                    <dt>KYC status</dt>
                    <dd>{formatLabel(borrower.kycStatus)}</dd>
                  </div>
                  <div>
                    <dt>Credit score</dt>
                    <dd>{borrower.creditScore ?? "Not available"}</dd>
                  </div>
                  <div>
                    <dt>Joined</dt>
                    <dd>{formatDate(borrower.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Outstanding</dt>
                    <dd>{formatCurrency(borrower.outstandingAmount)}</dd>
                  </div>
                </dl>
              </section>
            ) : (
              <div className="borrower-panel-loans">
                <button
                  type="button"
                  className="borrower-panel-name-button"
                  onClick={() => setView("profile")}
                >
                  <span
                    className="borrower-panel-name-button__avatar"
                    aria-hidden="true"
                  >
                    <UserRound size={20} />
                  </span>
                  <span>
                    <strong>{borrower.fullName}</strong>
                    <small>View profile details</small>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>

                <div className="borrower-panel-section-heading">
                  <div>
                    <h3>Loans with you</h3>
                    <p>
                      {borrower.loanCount} total · {borrower.activeLoansCount}{" "}
                      active
                    </p>
                  </div>
                  <strong>
                    {formatCurrency(borrower.outstandingAmount)} remaining
                  </strong>
                </div>

                <div className="borrower-panel-loan-list">
                  {borrower.loans.length > 0 ? (
                    borrower.loans.map((loan) => (
                      <LoanPortfolioCard
                        key={loan.id}
                        status={loan.status}
                        principal={loan.amount}
                        remaining={loan.remainingAmount}
                        interestRate={loan.interestRate}
                        tenureMonths={loan.tenureMonths}
                        createdAt={loan.createdAt}
                        onOpen={() => openLoan(loan)}
                      />
                    ))
                  ) : (
                    <div className="borrower-panel-state">
                      No lender-linked loans.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {selectedLoanId ? (
        <LoanDetailsModal
          lenderId={session.lenderId}
          loanId={selectedLoanId}
          borrowerName={borrower?.fullName}
          onOpenAgreement={onOpenAgreement}
          onClose={() => setSelectedLoanId(null)}
        />
      ) : null}
    </>
  );
}
