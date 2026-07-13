import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Landmark,
  ReceiptText,
  X,
} from 'lucide-react'
import {
  fetchLoanLedgerDetails,
  recordInstallmentPayment,
  type LoanLedgerDetailsResponse,
  type LoanLedgerInstallmentDetail,
} from '../../lib/recent-transactions-api'

type LoanDetailsModalProps = {
  lenderId: string
  loanId: string
  borrowerName?: string | null
  initialShowPayments?: boolean
  onPaymentRecorded?: () => void
  onClose: () => void
}

type PaymentFormState = {
  installmentId: string | null
  amount: string
  paidAt: string
  note: string
  isSaving: boolean
  error: string | null
  success: string | null
}

const currencyFormatter = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
})

function getLocalDateValue(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function createEmptyPaymentForm(): PaymentFormState {
  return {
    installmentId: null,
    amount: '',
    paidAt: getLocalDateValue(),
    note: '',
    isSaving: false,
    error: null,
    success: null,
  }
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string | null): string {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : new Intl.DateTimeFormat('en-LK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date)
}

function getStatusBadgeClass(value: string): string {
  if (value === 'overdue' || value === 'failed') return 'badge-danger'
  if (value === 'paid' || value === 'completed') return 'badge-success'
  return 'badge-gray'
}

function getOutstanding(installment: LoanLedgerInstallmentDetail): number {
  return Math.max(0, installment.amount - installment.paidAmount)
}

export default function LoanDetailsModal({
  lenderId,
  loanId,
  borrowerName,
  initialShowPayments = false,
  onPaymentRecorded,
  onClose,
}: LoanDetailsModalProps) {
  const [details, setDetails] = useState<LoanLedgerDetailsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPayments, setShowPayments] = useState(initialShowPayments)
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(
    createEmptyPaymentForm,
  )

  useEffect(() => {
    let isMounted = true

    async function loadDetails() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchLoanLedgerDetails(lenderId, loanId)
        if (isMounted) setDetails(response)
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load loan details.',
          )
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadDetails()
    return () => {
      isMounted = false
    }
  }, [lenderId, loanId])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const payments = useMemo(
    () =>
      (details?.installments ?? [])
        .flatMap((installment, installmentIndex) =>
          installment.payments.map((payment) => ({
            ...payment,
            installmentNumber: installmentIndex + 1,
          })),
        )
        .sort(
          (left, right) =>
            new Date(right.createdAt ?? 0).getTime() -
            new Date(left.createdAt ?? 0).getTime(),
        ),
    [details],
  )

  const nextUnpaidInstallment = details?.installments.find(
    (installment) => getOutstanding(installment) > 0,
  )

  function openPaymentForm(installment: LoanLedgerInstallmentDetail) {
    setShowPayments(true)
    setPaymentForm({
      installmentId: installment.id,
      amount: String(getOutstanding(installment)),
      paidAt: getLocalDateValue(),
      note: '',
      isSaving: false,
      error: null,
      success: null,
    })
  }

  async function handleRecordPayment(installmentId: string) {
    const amount = Number(paymentForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentForm((current) => ({
        ...current,
        error: 'The installment does not have a valid outstanding amount.',
      }))
      return
    }

    setPaymentForm((current) => ({
      ...current,
      isSaving: true,
      error: null,
      success: null,
    }))

    try {
      const updatedDetails = await recordInstallmentPayment(
        lenderId,
        loanId,
        installmentId,
        {
          amount,
          paidAt: paymentForm.paidAt,
          note: paymentForm.note,
        },
      )

      setDetails(updatedDetails)
      setPaymentForm({
        ...createEmptyPaymentForm(),
        success: 'Payment recorded successfully.',
      })
      onPaymentRecorded?.()
    } catch (saveError) {
      setPaymentForm((current) => ({
        ...current,
        isSaving: false,
        error:
          saveError instanceof Error
            ? saveError.message
            : 'Failed to record the payment.',
      }))
    }
  }

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
              <h2 id="loan-details-title">Loan details</h2>
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
              {error ?? 'Loan details are unavailable.'}
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
                  <strong>{formatCurrency(details.loan.remainingAmount)}</strong>
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

              <div className="loan-details-actions">
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
                <button
                  className="button button-primary"
                  type="button"
                  disabled={!nextUnpaidInstallment}
                  onClick={() =>
                    nextUnpaidInstallment && openPaymentForm(nextUnpaidInstallment)
                  }
                >
                  <CircleDollarSign size={18} />
                  {nextUnpaidInstallment ? 'Record payment' : 'All paid'}
                </button>
              </div>

              {paymentForm.success ? (
                <p className="create-ad-banner create-ad-banner--primary">
                  {paymentForm.success}
                </p>
              ) : null}

              {showPayments ? (
                <div className="loan-details-payments">
                  {details.installments.length ? (
                    details.installments.map((installment, index) => {
                      const outstanding = getOutstanding(installment)
                      const isFormOpen =
                        paymentForm.installmentId === installment.id

                      return (
                        <article
                          className="loan-installment-record"
                          key={installment.id}
                        >
                          <div className="loan-installment-record__header">
                            <div>
                              <span>Installment {index + 1}</span>
                              <strong>{formatDate(installment.dueDate)}</strong>
                            </div>
                            <span
                              className={`badge ${getStatusBadgeClass(
                                installment.status,
                              )}`}
                            >
                              {formatLabel(installment.status)}
                            </span>
                          </div>

                          <div className="loan-installment-record__summary">
                            <div>
                              <span>Amount due</span>
                              <strong>{formatCurrency(installment.amount)}</strong>
                            </div>
                            <div>
                              <span>Paid</span>
                              <strong>
                                {formatCurrency(installment.paidAmount)}
                              </strong>
                            </div>
                            <div>
                              <span>Outstanding</span>
                              <strong>{formatCurrency(outstanding)}</strong>
                            </div>
                            <button
                              className="button button-secondary"
                              type="button"
                              disabled={outstanding <= 0}
                              onClick={() => openPaymentForm(installment)}
                            >
                              {outstanding > 0 ? 'Record payment' : 'Paid'}
                            </button>
                          </div>

                          {isFormOpen ? (
                            <div className="loan-payment-form">
                              <div className="create-ad-form-grid">
                                <label className="create-ad-field">
                                  <span className="create-ad-field__label">
                                    Payment amount
                                  </span>
                                  <input
                                    className="input"
                                    type="number"
                                    value={paymentForm.amount}
                                    readOnly
                                  />
                                  <span className="dashboard-table__subcopy">
                                    Installments are settled once and in full.
                                  </span>
                                </label>
                                <label className="create-ad-field">
                                  <span className="create-ad-field__label">
                                    Payment date
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
                                    placeholder="Optional payment note"
                                    value={paymentForm.note}
                                    onChange={(event) =>
                                      setPaymentForm((current) => ({
                                        ...current,
                                        note: event.target.value,
                                        error: null,
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
                                  className="button button-secondary"
                                  type="button"
                                  onClick={() =>
                                    setPaymentForm(createEmptyPaymentForm())
                                  }
                                >
                                  Cancel
                                </button>
                                <button
                                  className="button button-primary"
                                  type="button"
                                  disabled={paymentForm.isSaving}
                                  onClick={() =>
                                    void handleRecordPayment(installment.id)
                                  }
                                >
                                  {paymentForm.isSaving
                                    ? 'Recording...'
                                    : 'Confirm payment'}
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {installment.payments.length ? (
                            <div className="loan-installment-record__payments">
                              {installment.payments.map((payment) => (
                                <div
                                  className="loan-ledger-payment-row"
                                  key={payment.id}
                                >
                                  <div className="dashboard-table__stack">
                                    <strong>{formatCurrency(payment.amount)}</strong>
                                    <span className="dashboard-table__subcopy">
                                      {formatDate(payment.createdAt)}
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
                              ))}
                            </div>
                          ) : null}
                        </article>
                      )
                    })
                  ) : (
                    <div className="loan-details-state">
                      No installments are available for this loan.
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
