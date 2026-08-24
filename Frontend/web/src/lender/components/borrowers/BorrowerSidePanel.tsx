import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  IdCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
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

function getKycStatusTone(value: string): "verified" | "rejected" | "review" {
  const normalized = value.toLowerCase();
  if (normalized === "approved") return "verified";
  if (normalized === "rejected") return "rejected";
  return "review";
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
                <div className="borrower-panel-profile__hero">
                  <span
                    className="borrower-panel-profile__avatar"
                    aria-hidden="true"
                  >
                    {borrower.fullName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="borrower-panel-profile__heading">
                    <h3>{borrower.fullName}</h3>
                    <div className="borrower-panel-profile__badges">
                      <span
                        className={`borrower-profile-status borrower-profile-status--${
                          borrower.isActive ? "active" : "inactive"
                        }`}
                      >
                        {borrower.isActive
                          ? "Active account"
                          : "Inactive account"}
                      </span>
                      <span
                        className={`borrower-profile-status borrower-profile-status--${getKycStatusTone(
                          borrower.kycStatus,
                        )}`}
                      >
                        <ShieldCheck size={13} aria-hidden="true" />
                        {formatLabel(borrower.kycStatus)} KYC
                      </span>
                    </div>
                  </div>
                </div>

                <div className="borrower-panel-profile__metrics">
                  <article>
                    <span aria-hidden="true">
                      <CircleDollarSign size={19} />
                    </span>
                    <div>
                      <p>Outstanding balance</p>
                      <strong>
                        {formatCurrency(borrower.outstandingAmount)}
                      </strong>
                    </div>
                  </article>
                  <article>
                    <span aria-hidden="true">
                      <CreditCard size={19} />
                    </span>
                    <div>
                      <p>Credit score</p>
                      <strong>{borrower.creditScore ?? "Not available"}</strong>
                    </div>
                  </article>
                </div>

                <section className="borrower-profile-section">
                  <div className="borrower-profile-section__heading">
                    <h4>Contact information</h4>
                    <p>Borrower-provided contact details</p>
                  </div>
                  <dl className="borrower-profile-list">
                    <div>
                      <dt>
                        <Phone size={17} aria-hidden="true" />
                        Phone
                      </dt>
                      <dd>
                        {borrower.phone ? (
                          <a href={`tel:${borrower.phone}`}>{borrower.phone}</a>
                        ) : (
                          <span className="borrower-profile-list__empty">
                            Not available
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <Mail size={17} aria-hidden="true" />
                        Email
                      </dt>
                      <dd>
                        {borrower.email ? (
                          <a href={`mailto:${borrower.email}`}>
                            {borrower.email}
                          </a>
                        ) : (
                          <span className="borrower-profile-list__empty">
                            Not available
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <MapPin size={17} aria-hidden="true" />
                        Address
                      </dt>
                      <dd>
                        {borrower.address ?? (
                          <span className="borrower-profile-list__empty">
                            Not available
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="borrower-profile-section">
                  <div className="borrower-profile-section__heading">
                    <h4>Account details</h4>
                    <p>Identity and membership information</p>
                  </div>
                  <dl className="borrower-profile-list">
                    <div>
                      <dt>
                        <IdCard size={17} aria-hidden="true" />
                        NIC
                      </dt>
                      <dd>
                        {borrower.nic ?? (
                          <span className="borrower-profile-list__empty">
                            Not available
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <CalendarDays size={17} aria-hidden="true" />
                        Joined
                      </dt>
                      <dd>{formatDate(borrower.createdAt)}</dd>
                    </div>
                  </dl>
                </section>
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
