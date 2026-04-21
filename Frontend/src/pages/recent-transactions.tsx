import { useEffect, useMemo, useState } from 'react'
import {
  fetchBorrowerDetails,
  type BorrowerDetails,
} from '../lib/dashboard-api'
import type { LenderSession } from '../lib/lender-session'
import {
  fetchLoanLedgerDetails,
  type LoanLedgerDetailsResponse,
  fetchRecentTransactions,
  recordInstallmentPayment,
  type RecentTransactionItem,
  type RecentTransactionsResponse,
} from '../lib/recent-transactions-api'

type RecentTransactionsPageProps = {
  session: LenderSession
}

type DetailSection = 'loan' | 'borrower'

type PaymentFormState = {
  installmentId: string | null
  amount: string
  paidAt: string
  note: string
  error: string | null
  success: string | null
  isSaving: boolean
}

const API_LIMIT = 30

const currencyFormatter = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
})

function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Unknown'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

function getStatusBadgeClass(value: string): string {
  if (value === 'overdue' || value === 'defaulted' || value === 'failed') {
    return 'badge-danger'
  }

  if (value === 'paid' || value === 'completed' || value === 'repayment') {
    return 'badge-success'
  }

  return 'badge-gray'
}

export default function RecentTransactionsPage({
  session,
}: RecentTransactionsPageProps) {
  const [response, setResponse] = useState<RecentTransactionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTransaction, setSelectedTransaction] =
    useState<RecentTransactionItem | null>(null)
  const [detailSection, setDetailSection] = useState<DetailSection>('loan')
  const [borrowerDetails, setBorrowerDetails] = useState<BorrowerDetails | null>(null)
  const [loanDetails, setLoanDetails] = useState<LoanLedgerDetailsResponse | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    installmentId: null,
    amount: '',
    paidAt: new Date().toISOString().slice(0, 10),
    note: '',
    error: null,
    success: null,
    isSaving: false,
  })

  async function loadTransactionsData() {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchRecentTransactions(session.lenderId, API_LIMIT)
      setResponse(data)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load recent transactions.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const loadTransactions = async () => {
      try {
        const data = await fetchRecentTransactions(session.lenderId, API_LIMIT)

        if (isMounted) {
          setResponse(data)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load recent transactions.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadTransactions()

    return () => {
      isMounted = false
    }
  }, [session.lenderId])

  useEffect(() => {
    if (!selectedTransaction) {
      return
    }

    let isMounted = true

    const loadDetails = async () => {
      try {
        setIsDetailLoading(true)
        setDetailError(null)

        const [borrowerData, loanData] = await Promise.all([
          fetchBorrowerDetails(session.lenderId, selectedTransaction.borrowerId),
          fetchLoanLedgerDetails(session.lenderId, selectedTransaction.loanId),
        ])

        if (isMounted) {
          setBorrowerDetails(borrowerData)
          setLoanDetails(loanData)
        }
      } catch (loadError) {
        if (isMounted) {
          setDetailError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load loan activity details.',
          )
        }
      } finally {
        if (isMounted) {
          setIsDetailLoading(false)
        }
      }
    }

    void loadDetails()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedTransaction(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      isMounted = false
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedTransaction, session.lenderId])

  function openLoanSection(transaction: RecentTransactionItem) {
    setSelectedTransaction(transaction)
    setDetailSection('loan')
    setBorrowerDetails(null)
    setLoanDetails(null)
    setDetailError(null)
    setPaymentForm({
      installmentId: null,
      amount: '',
      paidAt: new Date().toISOString().slice(0, 10),
      note: '',
      error: null,
      success: null,
      isSaving: false,
    })
  }

  function openBorrowerSection(transaction: RecentTransactionItem) {
    setSelectedTransaction(transaction)
    setDetailSection('borrower')
    setBorrowerDetails(null)
    setLoanDetails(null)
    setDetailError(null)
  }

  function openPaymentForm(installmentId: string) {
    setPaymentForm({
      installmentId,
      amount: '',
      paidAt: new Date().toISOString().slice(0, 10),
      note: '',
      error: null,
      success: null,
      isSaving: false,
    })
  }

  async function handleRecordPayment(installmentId: string) {
    if (!selectedTransaction) {
      return
    }

    const amount = Number(paymentForm.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentForm((current) => ({
        ...current,
        error: 'Enter a valid payment amount greater than zero.',
        success: null,
      }))
      return
    }

    try {
      setPaymentForm((current) => ({
        ...current,
        isSaving: true,
        error: null,
        success: null,
      }))

      const updatedLoanDetails = await recordInstallmentPayment(
        session.lenderId,
        selectedTransaction.loanId,
        installmentId,
        {
          amount,
          paidAt: paymentForm.paidAt,
          note: paymentForm.note,
        },
      )

      setLoanDetails(updatedLoanDetails)
      setPaymentForm({
        installmentId: null,
        amount: '',
        paidAt: new Date().toISOString().slice(0, 10),
        note: '',
        error: null,
        success: 'Payment recorded successfully.',
        isSaving: false,
      })
      await loadTransactionsData()
    } catch (saveError) {
      setPaymentForm((current) => ({
        ...current,
        isSaving: false,
        error:
          saveError instanceof Error
            ? saveError.message
            : 'Failed to record payment.',
        success: null,
      }))
    }
  }

  const transactions = useMemo(
    () => response?.transactions ?? [],
    [response?.transactions],
  )

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return transactions
    }

    return transactions.filter((transaction) => {
      return (
        transaction.borrowerName.toLowerCase().includes(normalizedQuery) ||
        transaction.borrowerEmail.toLowerCase().includes(normalizedQuery) ||
        transaction.loanId.toLowerCase().includes(normalizedQuery) ||
        (transaction.installmentId ?? '').toLowerCase().includes(normalizedQuery) ||
        formatLabel(transaction.loanStatus).toLowerCase().includes(normalizedQuery) ||
        formatLabel(transaction.installmentSummary.latestInstallmentStatus)
          .toLowerCase()
          .includes(normalizedQuery)
      )
    })
  }, [transactions, searchQuery])

  const summaryCards = [
    {
      label: 'Recent Payments',
      value: response ? String(response.summary.totalTransactions) : '--',
      caption: 'Loan-linked payments recorded for this lender',
      accent: 'PM',
      tone: 'primary',
    },
    {
      label: 'Total Collected',
      value: response ? formatCurrency(response.summary.totalCollected) : '--',
      caption: 'Total repayments recorded for this lender',
      accent: 'LKR',
      tone: 'success',
    },
    {
      label: 'Loans With Activity',
      value: response ? String(response.summary.loansWithActivity) : '--',
      caption: 'Lender-owned loans with transaction history',
      accent: 'LN',
      tone: 'warning',
    },
    {
      label: 'Overdue Installments',
      value: response ? String(response.summary.overdueInstallments) : '--',
      caption: 'Installments still overdue across those loans',
      accent: 'OD',
      tone: 'danger',
    },
  ]

  return (
    <>
      <section className="dashboard-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Lender cash flow</p>
            <h1 className="page-title">Loans</h1>
            <p className="page-subtitle">
              Review your loan activity ledger with lender-owned payments,
              installment progress, and remaining balances in one place.
            </p>
            <p className="dashboard-context-pill">
              Loan ledger: {session.displayName} - {session.lenderId}
            </p>
          </div>
        </header>

        {isLoading ? (
          <section className="card loading-card">
            <p>Loading loan activity ledger...</p>
          </section>
        ) : error ? (
          <section className="card error-card">
            <h2>Loan activity ledger is not available yet</h2>
            <p>{error}</p>
            <p>
              Check the lender loan ledger API, lender-linked loan data, and
              whether payment or transaction records exist in Firestore.
            </p>
          </section>
        ) : (
          <>
            <section className="summary-grid" aria-label="Loan activity summary">
              {summaryCards.map((card) => (
                <article className="card metric-card" key={card.label}>
                  <div
                    className={`metric-icon metric-icon--${card.tone}`}
                    aria-hidden="true"
                  >
                    {card.accent}
                  </div>
                  <div className="metric-copy">
                    <p className="metric-label">{card.label}</p>
                    <p className="metric-value">{card.value}</p>
                    <p className="metric-caption">{card.caption}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="card pending-requests-card">
              <div className="borrowers-toolbar">
                <div>
                  <h2 className="section-title">Loan Activity Ledger</h2>
                  <p className="section-subtitle">
                    Every row is a lender-linked payment record, with the loan and
                    installment context shown beside it.
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
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((transaction) => (
                        <tr
                          key={transaction.transactionId}
                          className="dashboard-table__row"
                          onClick={() => openLoanSection(transaction)}
                        >
                          <td>
                            <div className="borrower-cell">
                              <span className="borrower-avatar" aria-hidden="true">
                                {transaction.borrowerName.slice(0, 2).toUpperCase()}
                              </span>
                              <div>
                                <button
                                  type="button"
                                  className="borrower-name borrower-name--button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    openBorrowerSection(transaction)
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
                                  : ''}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="dashboard-table__stack">
                              <span>{formatCurrency(transaction.amount)}</span>
                              <span className="dashboard-table__subcopy">
                                {formatDate(transaction.createdAt)} ·{' '}
                                {transaction.source === 'payment'
                                  ? 'Payment record'
                                  : 'Transaction record'}
                              </span>
                            </div>
                          </td>
                          <td>{formatCurrency(transaction.remainingAmount)}</td>
                          <td>
                            <div className="dashboard-table__stack">
                              <span>
                                {transaction.installmentSummary.paidInstallments}/
                                {transaction.installmentSummary.totalInstallments} paid
                              </span>
                              <span
                                className={`badge ${getStatusBadgeClass(
                                  transaction.installmentSummary.latestInstallmentStatus,
                                )}`}
                              >
                                {formatLabel(
                                  transaction.installmentSummary.latestInstallmentStatus,
                                )}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="dashboard-table__stack">
                              <span>
                                {formatDate(transaction.installmentSummary.nextDueDate)}
                              </span>
                              <span className="dashboard-table__subcopy">
                                {transaction.installmentSummary.overdueInstallments}{' '}
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
                            ? 'No loan ledger entries match the current search.'
                            : 'No recent lender-linked payment activity is available yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
              <div className="analytics-range-tabs" role="tablist" aria-label="Loan detail sections">
                <button
                  type="button"
                  className={`analytics-range-tab${
                    detailSection === 'loan' ? ' analytics-range-tab--active' : ''
                  }`}
                  role="tab"
                  aria-selected={detailSection === 'loan'}
                  onClick={() => setDetailSection('loan')}
                >
                  Loan, Installments, Payments
                </button>
                <button
                  type="button"
                  className={`analytics-range-tab${
                    detailSection === 'borrower' ? ' analytics-range-tab--active' : ''
                  }`}
                  role="tab"
                  aria-selected={detailSection === 'borrower'}
                  onClick={() => setDetailSection('borrower')}
                >
                  Borrower Details
                </button>
              </div>

              <div className="borrower-modal__content">
                {isDetailLoading ? (
                  <div className="borrower-modal__state">Loading loan activity details...</div>
                ) : detailError ? (
                  <div className="borrower-modal__state borrower-modal__state--error">
                    {detailError}
                  </div>
                ) : detailSection === 'loan' ? (
                  <div className="borrower-modal__content">
                    <div className="borrower-modal__grid">
                      {[
                        { label: 'Ledger Entry ID', value: selectedTransaction.transactionId },
                        { label: 'Loan ID', value: selectedTransaction.loanId },
                        {
                          label: 'Installment ID',
                          value: selectedTransaction.installmentId ?? 'Not linked',
                        },
                        { label: 'Loan Status', value: formatLabel(selectedTransaction.loanStatus) },
                        {
                          label: 'Loan Amount',
                          value: formatCurrency(loanDetails?.loan.amount ?? 0),
                        },
                        {
                          label: 'Remaining Amount',
                          value: formatCurrency(loanDetails?.loan.remainingAmount ?? 0),
                        },
                        {
                          label: 'Interest Rate',
                          value: `${loanDetails?.loan.interestRate ?? 0}%`,
                        },
                        {
                          label: 'Tenure',
                          value: `${loanDetails?.loan.tenureMonths ?? 0} months`,
                        },
                        { label: 'Entry Type', value: formatLabel(selectedTransaction.type) },
                        { label: 'Entry Status', value: formatLabel(selectedTransaction.status) },
                        { label: 'Amount', value: formatCurrency(selectedTransaction.amount) },
                        { label: 'Recorded On', value: formatDate(selectedTransaction.createdAt) },
                      ].map((field) => (
                        <article className="borrower-detail-card" key={field.label}>
                          <p className="borrower-detail-card__label">{field.label}</p>
                          <p className="borrower-detail-card__value">{field.value}</p>
                        </article>
                      ))}
                    </div>

                    <section className="borrower-loans-section">
                      <div className="borrower-loans-section__header">
                        <div>
                          <h3 className="section-title">Installments and payments</h3>
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
                            <article className="borrower-loan-card" key={installment.id}>
                              <div className="borrower-loan-card__header">
                                <div>
                                  <p className="borrower-loan-card__eyebrow">Installment</p>
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
                                  <p className="borrower-detail-card__label">Due Date</p>
                                  <p className="borrower-detail-card__value">
                                    {formatDate(installment.dueDate)}
                                  </p>
                                </article>
                                <article className="borrower-detail-card">
                                  <p className="borrower-detail-card__label">Installment Amount</p>
                                  <p className="borrower-detail-card__value">
                                    {formatCurrency(installment.amount)}
                                  </p>
                                </article>
                                <article className="borrower-detail-card">
                                  <p className="borrower-detail-card__label">Paid Amount</p>
                                  <p className="borrower-detail-card__value">
                                    {formatCurrency(installment.paidAmount)}
                                  </p>
                                </article>
                                <article className="borrower-detail-card">
                                  <p className="borrower-detail-card__label">Payments Count</p>
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
                                        installment.amount - installment.paidAmount,
                                      ),
                                    )}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="button button-primary"
                                  disabled={installment.paidAmount >= installment.amount}
                                  onClick={() => openPaymentForm(installment.id)}
                                >
                                  {installment.paidAmount >= installment.amount
                                    ? 'Fully paid'
                                    : 'Record Payment'}
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
                                      <span className="create-ad-field__label">Note</span>
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
                                      onClick={() => void handleRecordPayment(installment.id)}
                                    >
                                      {paymentForm.isSaving
                                        ? 'Saving...'
                                        : 'Save Payment'}
                                    </button>
                                  </div>
                                </div>
                              ) : null}

                              <div className="loan-ledger-payments">
                                <p className="borrower-detail-card__label">Payments</p>
                                {installment.payments.length > 0 ? (
                                  installment.payments.map((payment) => (
                                    <div className="loan-ledger-payment-row" key={payment.id}>
                                      <div className="dashboard-table__stack">
                                        <span>{payment.id}</span>
                                        <span className="dashboard-table__subcopy">
                                          {formatDate(payment.createdAt)} ·{' '}
                                          {payment.source === 'payment'
                                            ? 'Installment payment'
                                            : 'Transaction fallback'}
                                        </span>
                                      </div>
                                      <div className="dashboard-table__stack">
                                        <span>{formatCurrency(payment.amount)}</span>
                                        <span className="dashboard-table__subcopy">
                                          {formatLabel(payment.type)}
                                          {payment.note ? ` · ${payment.note}` : ''}
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
                                    No payment records are linked to this installment yet.
                                  </p>
                                )}
                              </div>
                            </article>
                          ))
                        ) : (
                          <div className="borrower-modal__state">
                            No installment details are available for this loan yet.
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                ) : borrowerDetails ? (
                  <div className="borrower-modal__content">
                    <div className="borrower-modal__grid">
                      {[
                        { label: 'Borrower ID', value: borrowerDetails.id },
                        { label: 'Full Name', value: borrowerDetails.fullName },
                        { label: 'Email', value: borrowerDetails.email },
                        { label: 'Phone', value: borrowerDetails.phone ?? 'Not provided' },
                        { label: 'Address', value: borrowerDetails.address ?? 'Not provided' },
                        { label: 'NIC', value: borrowerDetails.nic ?? 'Not provided' },
                        {
                          label: 'KYC Status',
                          value: formatLabel(borrowerDetails.kycStatus),
                        },
                        {
                          label: 'Credit Score',
                          value:
                            borrowerDetails.creditScore !== null
                              ? String(borrowerDetails.creditScore)
                              : 'Unknown',
                        },
                        {
                          label: 'Rating',
                          value:
                            borrowerDetails.rating !== null
                              ? String(borrowerDetails.rating)
                              : 'Unknown',
                        },
                        {
                          label: 'Loan Count',
                          value: String(borrowerDetails.loanCount),
                        },
                        {
                          label: 'Active Loans',
                          value: String(borrowerDetails.activeLoansCount),
                        },
                        {
                          label: 'Outstanding Amount',
                          value: formatCurrency(borrowerDetails.outstandingAmount),
                        },
                      ].map((field) => (
                        <article className="borrower-detail-card" key={field.label}>
                          <p className="borrower-detail-card__label">{field.label}</p>
                          <p className="borrower-detail-card__value">{field.value}</p>
                        </article>
                      ))}
                    </div>

                    <section className="borrower-loans-section">
                      <div className="borrower-loans-section__header">
                        <div>
                          <h3 className="section-title">Borrower loan summary</h3>
                          <p className="section-subtitle">
                            Loans this borrower has with you as the current lender.
                          </p>
                        </div>
                      </div>

                      <div className="borrower-loan-list">
                        {borrowerDetails.loans.map((loan) => (
                          <article className="borrower-loan-card" key={loan.id}>
                            <div className="borrower-loan-card__header">
                              <div>
                                <p className="borrower-loan-card__eyebrow">Loan</p>
                                <h4 className="borrower-loan-card__title">{loan.id}</h4>
                              </div>
                              <span className={`badge ${getStatusBadgeClass(loan.status)}`}>
                                {formatLabel(loan.status)}
                              </span>
                            </div>

                            <div className="borrower-loan-card__grid">
                              <article className="borrower-detail-card">
                                <p className="borrower-detail-card__label">Amount</p>
                                <p className="borrower-detail-card__value">
                                  {formatCurrency(loan.amount)}
                                </p>
                              </article>
                              <article className="borrower-detail-card">
                                <p className="borrower-detail-card__label">Remaining</p>
                                <p className="borrower-detail-card__value">
                                  {formatCurrency(loan.remainingAmount)}
                                </p>
                              </article>
                              <article className="borrower-detail-card">
                                <p className="borrower-detail-card__label">Interest Rate</p>
                                <p className="borrower-detail-card__value">
                                  {loan.interestRate}%
                                </p>
                              </article>
                              <article className="borrower-detail-card">
                                <p className="borrower-detail-card__label">Tenure</p>
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
                    Borrower details are not available yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
