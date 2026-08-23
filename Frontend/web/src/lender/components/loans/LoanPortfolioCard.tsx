import { ChevronRight } from "lucide-react";

type LoanPortfolioCardProps = {
  borrowerName?: string;
  status: string;
  principal: number;
  remaining: number;
  monthlyInstallment?: number;
  onOpen: () => void;
  onOpenBorrower?: () => void;
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

export default function LoanPortfolioCard({
  borrowerName,
  status,
  principal,
  remaining,
  monthlyInstallment,
  onOpen,
  onOpenBorrower,
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
        {monthlyInstallment !== undefined ? (
          <div>
            <dt>Monthly</dt>
            <dd>{formatCurrency(monthlyInstallment)}</dd>
          </div>
        ) : null}
      </dl>

      <footer className="portfolio-loan-card__footer">
        <span className="portfolio-loan-card__hint">Open for terms and payments</span>
        <span className="portfolio-loan-card__open">
          View loan <ChevronRight size={16} />
        </span>
      </footer>
    </article>
  );
}
