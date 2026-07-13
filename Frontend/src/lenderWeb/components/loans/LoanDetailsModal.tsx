import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Landmark, ReceiptText, X } from "lucide-react";
import {
  fetchLoanLedgerDetails,
  type LoanLedgerDetailsResponse,
} from "../../lib/recent-transactions-api";

type LoanDetailsModalProps = {
  lenderId: string;
  loanId: string;
  borrowerName?: string | null;
  initialShowPayments?: boolean;
  onClose: () => void;
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
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat("en-LK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
}

export default function LoanDetailsModal({
  lenderId,
  loanId,
  borrowerName,
  initialShowPayments = false,
  onClose,
}: LoanDetailsModalProps) {
  const [details, setDetails] = useState<LoanLedgerDetailsResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayments, setShowPayments] = useState(initialShowPayments);

  useEffect(() => {
    let isMounted = true;

    async function loadDetails() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchLoanLedgerDetails(lenderId, loanId);
        if (isMounted) setDetails(response);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load loan details.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadDetails();
    return () => {
      isMounted = false;
    };
  }, [lenderId, loanId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const payments = useMemo(
    () =>
      (details?.installments ?? [])
        .flatMap((installment) =>
          installment.payments.map((payment) => ({
            ...payment,
            installmentId: installment.id,
          })),
        )
        .sort(
          (left, right) =>
            new Date(right.createdAt ?? 0).getTime() -
            new Date(left.createdAt ?? 0).getTime(),
        ),
    [details],
  );

  return (
    <div
      className="loan-details-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="loan-details-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loan-details-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="loan-details-card__header">
          <div className="loan-details-card__heading">
            <span className="loan-details-card__icon">
              <Landmark size={20} />
            </span>
            <div>
              <h2 id="loan-details-title">Loan {loanId}</h2>
              {borrowerName ? <p>{borrowerName}</p> : null}
            </div>
          </div>
          <button
            className="loan-details-card__close"
            type="button"
            onClick={onClose}
          >
            <X size={19} />
            <span className="sr-only">Close</span>
          </button>
        </header>

        <div className="loan-details-card__body">
          {isLoading ? (
            <div className="loan-details-state">Loading loan details...</div>
          ) : error || !details ? (
            <div className="loan-details-state loan-details-state--error">
              {error ?? "Loan details are unavailable."}
            </div>
          ) : (
            <>
              <div className="loan-details-grid">
                <div>
                  <span>Status</span>
                  <strong>{formatLabel(details.loan.status)}</strong>
                </div>
                <div>
                  <span>Principal</span>
                  <strong>{formatCurrency(details.loan.amount)}</strong>
                </div>
                <div>
                  <span>Outstanding</span>
                  <strong>
                    {formatCurrency(details.loan.remainingAmount)}
                  </strong>
                </div>
                <div>
                  <span>Annual interest</span>
                  <strong>{details.loan.interestRate}%</strong>
                </div>
                <div>
                  <span>Tenure</span>
                  <strong>{details.loan.tenureMonths} months</strong>
                </div>
                <div>
                  <span>Created</span>
                  <strong>{formatDate(details.loan.createdAt)}</strong>
                </div>
              </div>

              <button
                className="loan-details-payments-toggle"
                type="button"
                onClick={() => setShowPayments((current) => !current)}
                aria-expanded={showPayments}
              >
                <span>
                  <ReceiptText size={18} /> Payments ({payments.length})
                </span>
                {showPayments ? (
                  <ChevronUp size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </button>

              {showPayments ? (
                <div className="loan-details-payments">
                  {payments.length ? (
                    <div className="table-container">
                      <table className="dashboard-table">
                        <thead>
                          <tr>
                            <th>Payment</th>
                            <th>Installment</th>
                            <th>Status</th>
                            <th>Amount</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((payment) => (
                            <tr key={payment.id}>
                              <td>
                                <strong>{payment.id}</strong>
                              </td>
                              <td>{payment.installmentId}</td>
                              <td>
                                <span className="badge badge-gray">
                                  {formatLabel(payment.status)}
                                </span>
                              </td>
                              <td>{formatCurrency(payment.amount)}</td>
                              <td>{formatDate(payment.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="loan-details-state">
                      No payments recorded for this loan.
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
