import { ChevronRight } from "lucide-react";
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

function getNextAction(agreement: SharedLegalDocument): string {
  if (agreement.legacyReadOnly) return "Read-only agreement";
  if (!agreement.lenderAcceptance.accepted) return "Your signature required";
  if (!agreement.disbursementConfirmation.confirmed) {
    return "Confirm external transfer";
  }
  if (!agreement.borrowerAcceptance.accepted) return "Waiting for borrower";
  if (agreement.status === "finalization_failed") return "Retry required";
  if (agreement.status === "fully_accepted") return "Agreement completed";
  return formatLabel(agreement.status);
}

export default function AgreementPortfolioCard({
  agreement,
  onOpen,
}: AgreementPortfolioCardProps) {
  const signaturesCompleted = Number(agreement.lenderAcceptance.accepted) +
    Number(agreement.borrowerAcceptance.accepted);
  const requiresAction =
    !agreement.legacyReadOnly &&
    (!agreement.lenderAcceptance.accepted ||
      (agreement.lenderAcceptance.accepted &&
        !agreement.disbursementConfirmation.confirmed) ||
      agreement.status === "finalization_failed");

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
          <dt>Monthly</dt>
          <dd>{formatMoney(agreement.terms.monthlyInstallmentMinor)}</dd>
        </div>
        <div>
          <dt>Signatures</dt>
          <dd>{signaturesCompleted}/2 complete</dd>
        </div>
      </dl>

      <footer className="portfolio-loan-card__footer agreement-portfolio-card__footer">
        <span
          className={`agreement-portfolio-card__attention${
            requiresAction
              ? " agreement-portfolio-card__attention--required"
              : ""
          }`}
        >
          {getNextAction(agreement)}
        </span>
        <span className="portfolio-loan-card__open">
          Review <ChevronRight size={16} />
        </span>
      </footer>
    </article>
  );
}
