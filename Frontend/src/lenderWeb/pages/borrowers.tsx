import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Landmark,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";
import LoanDetailsModal from "../components/loans/LoanDetailsModal";
import {
  fetchBorrowerDetails,
  fetchDashboardBorrowers,
  type BorrowerDetails,
  type DashboardBorrower,
  type DashboardBorrowersResponse,
} from "../lib/dashboard-api";
import type { LenderSession } from "../lib/lender-session";

const PAGE_SIZE = 12;

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

export default function BorrowersPage({ session }: { session: LenderSession }) {
  const [borrowers, setBorrowers] = useState<DashboardBorrower[]>([]);
  const [pageInfo, setPageInfo] = useState<
    DashboardBorrowersResponse["pageInfo"]
  >({
    pageSize: PAGE_SIZE,
    hasMore: false,
    nextCursor: null,
  });
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(
    null,
  );
  const [selectedBorrower, setSelectedBorrower] =
    useState<BorrowerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const activeCursor = pageCursors[currentPage - 1] ?? null;

  useEffect(() => {
    let isMounted = true;

    async function loadBorrowers() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchDashboardBorrowers(session.lenderId, {
          pageSize: PAGE_SIZE,
          cursor: activeCursor,
        });

        if (!isMounted) return;
        setBorrowers(response.borrowers);
        setPageInfo(response.pageInfo);

        if (response.pageInfo.nextCursor) {
          setPageCursors((current) => {
            if (current[currentPage] === response.pageInfo.nextCursor)
              return current;
            return [
              ...current.slice(0, currentPage),
              response.pageInfo.nextCursor,
            ];
          });
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load borrowers.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadBorrowers();
    return () => {
      isMounted = false;
    };
  }, [activeCursor, currentPage, session.lenderId]);

  useEffect(() => {
    if (!selectedBorrowerId) return;
    let isMounted = true;
    const borrowerId = selectedBorrowerId;

    async function loadProfile() {
      setIsProfileLoading(true);
      setProfileError(null);

      try {
        const profile = await fetchBorrowerDetails(
          session.lenderId,
          borrowerId,
        );
        if (isMounted) setSelectedBorrower(profile);
      } catch (loadError) {
        if (isMounted) {
          setProfileError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load borrower profile.",
          );
        }
      } finally {
        if (isMounted) setIsProfileLoading(false);
      }
    }

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, [selectedBorrowerId, session.lenderId]);

  const visibleBorrowers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return borrowers;

    return borrowers.filter((borrower) =>
      [
        borrower.fullName,
        borrower.email,
        borrower.id,
        borrower.kycStatus,
        borrower.latestLoanStatus,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [borrowers, search]);

  function openProfile(borrowerId: string) {
    setSelectedBorrowerId(borrowerId);
    setSelectedBorrower(null);
    setProfileError(null);
  }

  function closeProfile() {
    setSelectedLoanId(null);
    setSelectedBorrowerId(null);
    setSelectedBorrower(null);
    setProfileError(null);
  }

  if (selectedBorrowerId) {
    return (
      <>
        <section className="dashboard-panel">
          <header className="page-header borrower-profile-header">
            <div>
              <button
                className="borrower-profile-back"
                type="button"
                onClick={closeProfile}
              >
                <ArrowLeft size={17} /> Borrowers
              </button>
              <h1 className="page-title">Borrower Profile</h1>
            </div>
          </header>

          {isProfileLoading ? (
            <section className="card loading-card">
              <p>Loading borrower...</p>
            </section>
          ) : profileError || !selectedBorrower ? (
            <section className="card error-card">
              <h2>Unable to load borrower</h2>
              <p>{profileError ?? "Borrower not found."}</p>
            </section>
          ) : (
            <>
              <section className="card borrower-profile-identity">
                <div className="borrower-profile-avatar">
                  {selectedBorrower.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2>{selectedBorrower.fullName}</h2>
                  <p>{selectedBorrower.email}</p>
                  <div className="borrower-profile-badges">
                    <span className="badge badge-gray">
                      {formatLabel(selectedBorrower.kycStatus)}
                    </span>
                    <span className="badge badge-gray">
                      {selectedBorrower.isActive ? "Active" : "Suspended"}
                    </span>
                  </div>
                </div>
              </section>

              <section className="summary-grid" aria-label="Borrower summary">
                {[
                  {
                    label: "Loans",
                    value: String(selectedBorrower.loanCount),
                    icon: Landmark,
                  },
                  {
                    label: "Active",
                    value: String(selectedBorrower.activeLoansCount),
                    icon: CheckCircle2,
                  },
                  {
                    label: "Total Borrowed",
                    value: formatCurrency(selectedBorrower.totalBorrowedAmount),
                    icon: Wallet,
                  },
                  {
                    label: "Outstanding",
                    value: formatCurrency(selectedBorrower.outstandingAmount),
                    icon: UserRound,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <article className="card metric-card" key={item.label}>
                      <div className="metric-icon metric-icon--primary">
                        <Icon size={22} />
                      </div>
                      <div className="metric-copy">
                        <p className="metric-label">{item.label}</p>
                        <p className="metric-value">{item.value}</p>
                      </div>
                    </article>
                  );
                })}
              </section>

              <section className="card borrower-profile-details">
                <h2 className="section-title">Details</h2>
                <div className="borrower-profile-grid">
                  <div>
                    <span>Borrower ID</span>
                    <strong>{selectedBorrower.id}</strong>
                  </div>
                  <div>
                    <span>Phone</span>
                    <strong>{selectedBorrower.phone ?? "Not available"}</strong>
                  </div>
                  <div>
                    <span>Credit score</span>
                    <strong>
                      {selectedBorrower.creditScore ?? "Not available"}
                    </strong>
                  </div>
                  <div>
                    <span>KYC status</span>
                    <strong>{formatLabel(selectedBorrower.kycStatus)}</strong>
                  </div>
                  <div>
                    <span>Joined</span>
                    <strong>{formatDate(selectedBorrower.createdAt)}</strong>
                  </div>
                  <div>
                    <span>Address</span>
                    <strong>
                      {selectedBorrower.address ?? "Not available"}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="card borrowers-card">
                <h2 className="section-title">Loans With This Lender</h2>
                <div className="table-container">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Loan</th>
                        <th>Status</th>
                        <th>Principal</th>
                        <th>Outstanding</th>
                        <th>Interest</th>
                        <th>Tenure</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBorrower.loans.length ? (
                        selectedBorrower.loans.map((loan) => (
                          <tr
                            className="dashboard-table__row"
                            key={loan.id}
                            onClick={() => setSelectedLoanId(loan.id)}
                          >
                            <td>
                              <strong>{loan.id}</strong>
                            </td>
                            <td>
                              <span className="badge badge-gray">
                                {formatLabel(loan.status)}
                              </span>
                            </td>
                            <td>{formatCurrency(loan.amount)}</td>
                            <td>{formatCurrency(loan.remainingAmount)}</td>
                            <td>{loan.interestRate}%</td>
                            <td>{loan.tenureMonths} months</td>
                            <td>{formatDate(loan.createdAt)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="table-empty" colSpan={7}>
                            No lender-linked loans.
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

        {selectedLoanId ? (
          <LoanDetailsModal
            lenderId={session.lenderId}
            loanId={selectedLoanId}
            borrowerName={selectedBorrower?.fullName}
            onClose={() => setSelectedLoanId(null)}
          />
        ) : null}
      </>
    );
  }

  return (
    <section className="dashboard-panel">
      <header className="page-header">
        <h1 className="page-title">Borrowers</h1>
      </header>

      <section className="card borrowers-card">
        <div className="borrowers-toolbar">
          <div>
            <h2 className="section-title">Linked Borrowers</h2>
          </div>
          <label className="borrowers-search">
            <Search size={17} aria-hidden="true" />
            <input
              className="input"
              type="search"
              placeholder="Search borrowers"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        <div className="table-container">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Credit Score</th>
                <th>KYC</th>
                <th>Loans</th>
                <th>Outstanding</th>
                <th>Latest Loan</th>
                <th aria-label="Open profile" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="table-empty" colSpan={7}>
                    Loading borrowers...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="table-empty" colSpan={7}>
                    {error}
                  </td>
                </tr>
              ) : visibleBorrowers.length ? (
                visibleBorrowers.map((borrower) => (
                  <tr
                    className="dashboard-table__row"
                    key={borrower.id}
                    onClick={() => openProfile(borrower.id)}
                  >
                    <td>
                      <div className="borrower-cell">
                        <span className="borrower-avatar">
                          <UsersRound size={18} />
                        </span>
                        <div>
                          <p className="borrower-name">{borrower.fullName}</p>
                          <p className="borrower-email">{borrower.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>{borrower.creditScore ?? "N/A"}</td>
                    <td>
                      <span className="badge badge-gray">
                        <ShieldCheck size={14} />{" "}
                        {formatLabel(borrower.kycStatus)}
                      </span>
                    </td>
                    <td>{borrower.loanCount}</td>
                    <td>{formatCurrency(borrower.outstandingAmount)}</td>
                    <td>
                      <span className="badge badge-gray">
                        {formatLabel(borrower.latestLoanStatus)}
                      </span>
                    </td>
                    <td>
                      <ChevronRight size={18} aria-hidden="true" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="table-empty" colSpan={7}>
                    No linked borrowers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <p>Page {currentPage}</p>
          <div className="pagination">
            <button
              className="pagination-button"
              type="button"
              disabled={currentPage === 1 || isLoading}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </button>
            <button
              className="pagination-button"
              type="button"
              disabled={!pageInfo.hasMore || isLoading}
              onClick={() => setCurrentPage((page) => page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
