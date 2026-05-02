import { useEffect, useMemo, useState } from "react";
import type {
  AnalyticsDrilldownResponse,
  AnalyticsBreakdownPoint,
  AnalyticsOverviewResponse,
  AnalyticsTrendPoint,
} from "../lib/analytics-api";
import {
  fetchAnalyticsDrilldown,
  fetchAnalyticsOverview,
} from "../lib/analytics-api";
import type { LenderSession } from "../lib/lender-session";

const RANGE_OPTIONS = [
  { key: "30d", label: "30 Days" },
  { key: "90d", label: "90 Days" },
  { key: "365d", label: "12 Months" },
] as const;

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-LK", {
  style: "percent",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatPercent(value: number): string {
  return percentFormatter.format(value);
}

function formatShortDate(value: string | null): string {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat("en-LK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(parsed);
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function TrendBars({
  data,
  colorClassName,
}: {
  data: AnalyticsTrendPoint[];
  colorClassName: string;
}) {
  const maxValue = Math.max(...data.map((point) => point.value), 1);

  return (
    <div className="analytics-bars">
      {data.map((point) => (
        <div className="analytics-bars__item" key={point.label}>
          <div className="analytics-bars__track">
            <div
              className={`analytics-bars__fill ${colorClassName}`}
              style={{
                height: `${Math.max((point.value / maxValue) * 100, point.value > 0 ? 12 : 0)}%`,
              }}
            />
          </div>
          <p className="analytics-bars__value">{formatCurrency(point.value)}</p>
          <p className="analytics-bars__label">{point.label}</p>
        </div>
      ))}
    </div>
  );
}

function StatusBreakdown({ data }: { data: AnalyticsBreakdownPoint[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="analytics-status-list">
      {data.length > 0 ? (
        data.map((item) => {
          const width = total > 0 ? (item.value / total) * 100 : 0;

          return (
            <div className="analytics-status-list__item" key={item.label}>
              <div className="analytics-status-list__header">
                <span>{formatLabel(item.label)}</span>
                <strong>{item.value}</strong>
              </div>
              <div className="analytics-status-list__track">
                <div
                  className="analytics-status-list__fill"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })
      ) : (
        <p className="analytics-empty-copy">No loan status data yet.</p>
      )}
    </div>
  );
}

type AnalyticsPageProps = {
  session: LenderSession;
};

export default function AnalyticsPage({ session }: AnalyticsPageProps) {
  const [selectedRange, setSelectedRange] =
    useState<(typeof RANGE_OPTIONS)[number]["key"]>("90d");
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drilldownType, setDrilldownType] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<AnalyticsDrilldownResponse | null>(
    null,
  );
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchAnalyticsOverview(
          selectedRange,
        );

        if (isMounted) {
          setOverview(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load analytics data.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [selectedRange, session.lenderId]);

  useEffect(() => {
    if (!drilldownType) {
      return;
    }

    let isMounted = true;

    const loadDrilldown = async () => {
      try {
        setIsDrilldownLoading(true);
        setDrilldownError(null);
        const data = await fetchAnalyticsDrilldown(
          drilldownType,
          selectedRange,
        );

        if (isMounted) {
          setDrilldown(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setDrilldownError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load drilldown data.",
          );
        }
      } finally {
        if (isMounted) {
          setIsDrilldownLoading(false);
        }
      }
    };

    void loadDrilldown();

    return () => {
      isMounted = false;
    };
  }, [drilldownType, selectedRange, session.lenderId]);

  useEffect(() => {
    if (!drilldownType) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseDrilldown();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drilldownType]);

  const summaryCards = useMemo(() => {
    if (!overview) {
      return [];
    }

    return [
      {
        label: "Total Lent",
        value: formatCurrency(overview.summary.totalLent),
        caption: "Lending volume in selected period",
        tone: "primary",
        drilldownType: "total-lent",
      },
      {
        label: "Total Collected",
        value: formatCurrency(overview.summary.totalCollected),
        caption: "Repayments captured in selected period",
        tone: "success",
        drilldownType: "total-collected",
      },
      {
        label: "Active Loans",
        value: String(overview.summary.activeLoans),
        caption: "Loans currently in active status",
        tone: "warning",
        drilldownType: "active-loans",
      },
      {
        label: "Repayment Success",
        value: formatPercent(overview.summary.repaymentSuccessRate),
        caption: "Completed vs defaulted closed loans",
        tone: "danger",
        drilldownType: null,
      },
    ];
  }, [overview]);

  function handleOpenDrilldown(type: string) {
    setDrilldownType(type);
    setDrilldown(null);
    setDrilldownError(null);
  }

  function handleCloseDrilldown() {
    setDrilldownType(null);
    setDrilldown(null);
    setDrilldownError(null);
  }

  return (
    <>
      <section className="dashboard-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Lender analytics</p>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">
              Track lending growth, repayment quality, request conversion, and
              portfolio risk from a lender business perspective.
            </p>
          </div>

          <div className="analytics-header-tools">
            <div className="analytics-lender-pill">
              {session.displayName} • {session.lenderId}
            </div>
            <div
              className="analytics-range-tabs"
              role="tablist"
              aria-label="Time range"
            >
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`analytics-range-tab${
                    selectedRange === option.key
                      ? " analytics-range-tab--active"
                      : ""
                  }`}
                  onClick={() => setSelectedRange(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {isLoading ? (
          <section className="card loading-card">
            <p>Loading analytics...</p>
          </section>
        ) : error ? (
          <section className="card error-card">
            <h2>Analytics data is not available yet</h2>
            <p>{error}</p>
            <p>
              Check the analytics API, the lender ID, and whether lender-linked
              data exists in Firebase.
            </p>
          </section>
        ) : overview ? (
          <>
            <section className="summary-grid" aria-label="Analytics summary">
              {summaryCards.map((card) => {
                const isClickable = Boolean(card.drilldownType);

                return (
                  <button
                    key={card.label}
                    type="button"
                    className={`card metric-card analytics-drilldown-card${
                      isClickable
                        ? " analytics-drilldown-card--interactive"
                        : ""
                    }`}
                    onClick={() =>
                      card.drilldownType
                        ? handleOpenDrilldown(card.drilldownType)
                        : undefined
                    }
                    disabled={!card.drilldownType}
                  >
                    <div
                      className={`metric-icon metric-icon--${card.tone}`}
                      aria-hidden="true"
                    >
                      {card.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="metric-copy">
                      <p className="metric-label">{card.label}</p>
                      <p className="metric-value">{card.value}</p>
                      <p className="metric-caption">{card.caption}</p>
                    </div>
                    {isClickable ? (
                      <span className="analytics-drilldown-card__hint">
                        View
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </section>

            <section className="analytics-grid analytics-grid--primary">
              <article className="card analytics-card analytics-card--wide">
                <div className="analytics-card__header">
                  <div>
                    <h2 className="section-title">Lending Trend</h2>
                    <p className="section-subtitle">
                      How much capital moved into new loans across the selected
                      period.
                    </p>
                  </div>
                </div>
                <TrendBars
                  data={overview.trends.lendingByMonth}
                  colorClassName="analytics-bars__fill--primary"
                />
              </article>

              <article className="card analytics-card">
                <div className="analytics-card__header">
                  <div>
                    <h2 className="section-title">Loan Status Mix</h2>
                    <p className="section-subtitle">
                      Current distribution of lender-owned loans by status.
                    </p>
                  </div>
                </div>
                <StatusBreakdown data={overview.breakdowns.loanStatus} />
              </article>
            </section>

            <section className="analytics-grid analytics-grid--secondary">
              <article className="card analytics-card">
                <div className="analytics-card__header">
                  <div>
                    <h2 className="section-title">Collection Trend</h2>
                    <p className="section-subtitle">
                      Repayments recorded from your loan portfolio.
                    </p>
                  </div>
                </div>
                <TrendBars
                  data={overview.trends.collectionByMonth}
                  colorClassName="analytics-bars__fill--success"
                />
              </article>

              <article className="card analytics-card">
                <div className="analytics-card__header">
                  <div>
                    <h2 className="section-title">Business Health</h2>
                    <p className="section-subtitle">
                      Core lending economics that influence portfolio growth.
                    </p>
                  </div>
                </div>
                <div className="analytics-mini-grid">
                  <article className="analytics-mini-card">
                    <p className="analytics-mini-card__label">
                      Outstanding Amount
                    </p>
                    <p className="analytics-mini-card__value">
                      {formatCurrency(overview.portfolio.outstandingAmount)}
                    </p>
                  </article>
                  <article className="analytics-mini-card">
                    <p className="analytics-mini-card__label">
                      Average Loan Size
                    </p>
                    <p className="analytics-mini-card__value">
                      {formatCurrency(overview.portfolio.averageLoanSize)}
                    </p>
                  </article>
                  <article className="analytics-mini-card">
                    <p className="analytics-mini-card__label">
                      Average Interest
                    </p>
                    <p className="analytics-mini-card__value">
                      {overview.portfolio.averageInterestRate.toFixed(1)}%
                    </p>
                  </article>
                  <article className="analytics-mini-card">
                    <p className="analytics-mini-card__label">Average Tenure</p>
                    <p className="analytics-mini-card__value">
                      {overview.portfolio.averageTenureMonths.toFixed(1)} months
                    </p>
                  </article>
                </div>
              </article>
            </section>

            <section className="analytics-grid analytics-grid--secondary">
              <article className="card analytics-card">
                <div className="analytics-card__header">
                  <div>
                    <h2 className="section-title">Ad & Request Performance</h2>
                    <p className="section-subtitle">
                      See whether marketing activity is turning into real loan
                      opportunities.
                    </p>
                  </div>
                </div>
                <div className="analytics-mini-grid">
                  <button
                    type="button"
                    className="analytics-mini-card analytics-mini-card--interactive"
                    onClick={() => handleOpenDrilldown("active-ads")}
                  >
                    <p className="analytics-mini-card__label">Active Ads</p>
                    <p className="analytics-mini-card__value">
                      {overview.performance.activeAds}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="analytics-mini-card analytics-mini-card--interactive"
                    onClick={() => handleOpenDrilldown("requests-received")}
                  >
                    <p className="analytics-mini-card__label">
                      Requests Received
                    </p>
                    <p className="analytics-mini-card__value">
                      {overview.performance.requestsReceived}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="analytics-mini-card analytics-mini-card--interactive"
                    onClick={() => handleOpenDrilldown("accepted-requests")}
                  >
                    <p className="analytics-mini-card__label">
                      Accepted Requests
                    </p>
                    <p className="analytics-mini-card__value">
                      {overview.performance.acceptedRequests}
                    </p>
                  </button>
                  <article className="analytics-mini-card">
                    <p className="analytics-mini-card__label">
                      Conversion Rate
                    </p>
                    <p className="analytics-mini-card__value">
                      {formatPercent(
                        overview.performance.requestToLoanConversionRate,
                      )}
                    </p>
                  </article>
                </div>
              </article>

              <article className="card analytics-card">
                <div className="analytics-card__header">
                  <div>
                    <h2 className="section-title">Risk Watch</h2>
                    <p className="section-subtitle">
                      Keep an eye on repayment stress and borrower quality.
                    </p>
                  </div>
                </div>
                <div className="analytics-mini-grid">
                  <button
                    type="button"
                    className="analytics-mini-card analytics-mini-card--interactive"
                    onClick={() => handleOpenDrilldown("overdue-loans")}
                  >
                    <p className="analytics-mini-card__label">Overdue Loans</p>
                    <p className="analytics-mini-card__value">
                      {overview.risk.overdueLoans}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="analytics-mini-card analytics-mini-card--interactive"
                    onClick={() => handleOpenDrilldown("defaulted-loans")}
                  >
                    <p className="analytics-mini-card__label">
                      Defaulted Loans
                    </p>
                    <p className="analytics-mini-card__value">
                      {overview.risk.defaultedLoans}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="analytics-mini-card analytics-mini-card--interactive"
                    onClick={() => handleOpenDrilldown("open-disputes")}
                  >
                    <p className="analytics-mini-card__label">Open Disputes</p>
                    <p className="analytics-mini-card__value">
                      {overview.risk.openDisputes}
                    </p>
                  </button>
                  <article className="analytics-mini-card">
                    <p className="analytics-mini-card__label">
                      Avg Borrower Credit Score
                    </p>
                    <p className="analytics-mini-card__value">
                      {overview.risk.averageBorrowerCreditScore !== null
                        ? overview.risk.averageBorrowerCreditScore.toFixed(0)
                        : "N/A"}
                    </p>
                  </article>
                </div>
              </article>
            </section>

            <section className="card analytics-card">
              <div className="analytics-card__header">
                <div>
                  <h2 className="section-title">Business Insights</h2>
                  <p className="section-subtitle">
                    Quick plain-English takeaways for lender growth and
                    portfolio quality.
                  </p>
                </div>
              </div>
              <div className="analytics-insights">
                {overview.insights.length > 0 ? (
                  overview.insights.map((insight) => (
                    <article className="analytics-insight" key={insight}>
                      <span
                        className="analytics-insight__dot"
                        aria-hidden="true"
                      />
                      <p>{insight}</p>
                    </article>
                  ))
                ) : (
                  <p className="analytics-empty-copy">
                    Insights will appear when enough lender data is available.
                  </p>
                )}
              </div>
            </section>
          </>
        ) : null}
      </section>

      {drilldownType ? (
        <div
          className="borrower-modal__backdrop"
          role="presentation"
          onClick={handleCloseDrilldown}
        >
          <section
            className="borrower-modal analytics-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-drilldown-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="borrower-modal__header">
              <div>
                <p className="eyebrow">Analytics drilldown</p>
                <h2 className="section-title" id="analytics-drilldown-title">
                  {drilldown?.title ?? "Loading details..."}
                </h2>
                <p className="section-subtitle">
                  {drilldown?.description ??
                    "Review the underlying lender records behind this metric."}
                </p>
              </div>
              <button
                type="button"
                className="borrower-modal__close"
                aria-label="Close analytics drilldown"
                onClick={handleCloseDrilldown}
              >
                X
              </button>
            </div>

            <div className="borrower-modal__body">
              {isDrilldownLoading ? (
                <div className="borrower-modal__state">
                  Loading drilldown details...
                </div>
              ) : drilldownError ? (
                <div className="borrower-modal__state borrower-modal__state--error">
                  {drilldownError}
                </div>
              ) : drilldown ? (
                drilldown.items.length > 0 ? (
                  <div className="analytics-drilldown-list">
                    {drilldown.items.map((item) => (
                      <article
                        className="analytics-drilldown-item"
                        key={item.id}
                      >
                        <div className="analytics-drilldown-item__main">
                          <h3 className="analytics-drilldown-item__title">
                            {item.title}
                          </h3>
                          <p className="analytics-drilldown-item__subtitle">
                            {item.subtitle}
                          </p>
                        </div>
                        <div className="analytics-drilldown-item__meta">
                          <span className="badge badge-gray">
                            {formatLabel(item.status)}
                          </span>
                          <p className="analytics-drilldown-item__metric">
                            {item.metric}
                          </p>
                          {item.secondaryMetric ? (
                            <p className="analytics-drilldown-item__secondary">
                              {item.secondaryMetric}
                            </p>
                          ) : null}
                          <p className="analytics-drilldown-item__date">
                            {formatShortDate(item.date)}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="borrower-modal__state">
                    No records were found for this metric in the selected range.
                  </div>
                )
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
