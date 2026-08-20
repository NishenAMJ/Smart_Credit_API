import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
} from "lucide-react";
import type { SharedLegalDocument } from "../../../legal/types";

type AgreementPortfolioCardProps = {
  agreement: SharedLegalDocument;
  onOpen: () => void;
};

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

function formatMoney(amountMinor: number): string {
  return currencyFormatter.format(amountMinor / 100);
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-LK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
}

function SignatureState({
  label,
  accepted,
}: {
  label: string;
  accepted: boolean;
}) {
  const Icon = accepted ? CheckCircle2 : CircleDashed;
  return (
    <span
      className={`agreement-portfolio-card__signature${accepted ? " agreement-portfolio-card__signature--complete" : ""}`}
    >
      <Icon size={15} /> {label} {accepted ? "signed" : "pending"}
    </span>
  );
}

export default function AgreementPortfolioCard({
  agreement,
  onOpen,
}: AgreementPortfolioCardProps) {
  return (
    <article
      className="portfolio-loan-card agreement-portfolio-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <header className="portfolio-loan-card__header">
        <div>
          <span className="portfolio-loan-card__borrower">
            {agreement.borrower.fullName}
          </span>
          <strong className="portfolio-loan-card__amount">
            {formatMoney(agreement.terms.principalMinor)}
          </strong>
        </div>
        <div className="agreement-portfolio-card__status">
          <span className="badge badge-gray">
            {formatLabel(agreement.status)}
          </span>
          <small>Version {agreement.version}</small>
        </div>
      </header>

      <dl className="portfolio-loan-card__details">
        <div>
          <dt>Total repayable</dt>
          <dd>{formatMoney(agreement.terms.totalRepayableMinor)}</dd>
        </div>
        <div>
          <dt>Annual interest</dt>
          <dd>{agreement.terms.annualInterestRate.toFixed(1)}%</dd>
        </div>
        <div>
          <dt>Tenure</dt>
          <dd>{agreement.terms.tenureMonths} months</dd>
        </div>
        <div>
          <dt>Monthly installment</dt>
          <dd>{formatMoney(agreement.terms.monthlyInstallmentMinor)}</dd>
        </div>
      </dl>

      <div className="agreement-portfolio-card__signatures">
        <SignatureState
          label="Lender"
          accepted={agreement.lenderAcceptance.accepted}
        />
        <SignatureState
          label="Borrower"
          accepted={agreement.borrowerAcceptance.accepted}
        />
      </div>

      <footer className="portfolio-loan-card__footer agreement-portfolio-card__footer">
        <span className="portfolio-loan-card__date">
          <CalendarDays size={16} /> Updated {formatDate(agreement.updatedAt)}
        </span>
        <span className="portfolio-loan-card__open">
          Review agreement <ChevronRight size={16} />
        </span>
      </footer>
    </article>
  );
}
