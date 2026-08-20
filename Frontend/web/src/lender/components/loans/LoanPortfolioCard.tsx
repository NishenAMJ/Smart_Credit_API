import { CalendarDays, ChevronRight, CircleDollarSign } from "lucide-react";

type LoanPortfolioCardProps = {
  borrowerName?: string;
  status: string;
  principal: number;
  remaining: number;
  interestRate: number;
  tenureMonths: number;
  createdAt: string | null;
  monthlyInstallment?: number;
  installmentProgress?: {
    paid: number;
    total: number;
    nextDueAt: string | null;
  };
  onOpen: () => void;
  onOpenBorrower?: () => void;
  onOpenPayments?: () => void;
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

export default function LoanPortfolioCard({
  borrowerName,
  status,
  principal,
  remaining,
  interestRate,
  tenureMonths,
  createdAt,
  monthlyInstallment,
  installmentProgress,
  onOpen,
  onOpenBorrower,
  onOpenPayments,
}: LoanPortfolioCardProps) {
  return (
    <article
      className="portfolio-loan-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <header className="portfolio-loan-card__header">
        <div>
          {borrowerName ? (
            <button
              type="button"
              className="portfolio-loan-card__borrower"
              onClick={(event) => {
                event.stopPropagation();
                onOpenBorrower?.();
              }}
            >
              {borrowerName}
            </button>
          ) : (
            <span className="portfolio-loan-card__label">Loan principal</span>
          )}
          <strong className="portfolio-loan-card__amount">
            {formatCurrency(principal)}
          </strong>
        </div>
        <span className="badge badge-gray">{formatLabel(status)}</span>
      </header>

      <dl className="portfolio-loan-card__details">
        <div>
          <dt>Remaining</dt>
          <dd>{formatCurrency(remaining)}</dd>
        </div>
        <div>
          <dt>Interest</dt>
          <dd>{interestRate.toFixed(1)}%</dd>
        </div>
        <div>
          <dt>Tenure</dt>
          <dd>{tenureMonths} months</dd>
        </div>
        {monthlyInstallment !== undefined ? (
          <div>
            <dt>Monthly</dt>
            <dd>{formatCurrency(monthlyInstallment)}</dd>
          </div>
        ) : (
          <div>
            <dt>Started</dt>
            <dd>{formatDate(createdAt)}</dd>
          </div>
        )}
      </dl>

      <footer className="portfolio-loan-card__footer">
        {installmentProgress && onOpenPayments ? (
          <button
            type="button"
            className="portfolio-loan-card__payments"
            onClick={(event) => {
              event.stopPropagation();
              onOpenPayments();
            }}
          >
            <CircleDollarSign size={17} />
            <span>
              <strong>
                {installmentProgress.paid}/{installmentProgress.total} paid
              </strong>
              <small>Next: {formatDate(installmentProgress.nextDueAt)}</small>
            </span>
          </button>
        ) : (
          <span className="portfolio-loan-card__date">
            <CalendarDays size={16} /> Started {formatDate(createdAt)}
          </span>
        )}
        <span className="portfolio-loan-card__open">
          View loan <ChevronRight size={16} />
        </span>
      </footer>
    </article>
  );
}
