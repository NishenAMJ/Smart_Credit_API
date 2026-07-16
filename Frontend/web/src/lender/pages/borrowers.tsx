import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, ShieldCheck, UsersRound } from "lucide-react";
import BorrowerSidePanel from "../components/borrowers/BorrowerSidePanel";
import {
  fetchDashboardBorrowers,
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeCursor = pageCursors[currentPage - 1] ?? null;

  useEffect(() => {
    let isMounted = true;

    const loadBorrowers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetchDashboardBorrowers(session.lenderId, {
          pageSize: PAGE_SIZE,
          cursor: activeCursor,
        });

        if (!isMounted) return;
        setBorrowers(response.borrowers);
        setPageInfo(response.pageInfo);

        if (response.pageInfo.nextCursor) {
          setPageCursors((current) => {
            if (current[currentPage] === response.pageInfo.nextCursor) {
              return current;
            }
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
    };

    void loadBorrowers();
    return () => {
      isMounted = false;
    };
  }, [activeCursor, currentPage, session.lenderId]);

  const visibleBorrowers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return borrowers;

    return borrowers.filter((borrower) =>
      [
        borrower.fullName,
        borrower.kycStatus,
        borrower.latestLoanStatus,
        String(borrower.creditScore ?? ""),
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [borrowers, search]);

  return (
    <>
      <section className="dashboard-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Lender portfolio</p>
            <h1 className="page-title">Borrowers</h1>
            <p className="page-subtitle">
              Review the borrowers who currently have loans with you.
            </p>
          </div>
        </header>

        <section className="card borrowers-card">
          <div className="borrowers-toolbar">
            <div>
              <h2 className="section-title">Linked Borrowers</h2>
              <p className="section-subtitle">
                Select a borrower to review their loans and profile.
              </p>
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
                  <th aria-label="Open borrower" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="table-empty" colSpan={7}>Loading borrowers...</td></tr>
                ) : error ? (
                  <tr><td className="table-empty" colSpan={7}>{error}</td></tr>
                ) : visibleBorrowers.length > 0 ? (
                  visibleBorrowers.map((borrower) => (
                    <tr
                      className="dashboard-table__row"
                      key={borrower.id}
                      onClick={() => setSelectedBorrowerId(borrower.id)}
                    >
                      <td>
                        <div className="borrower-cell">
                          <span className="borrower-avatar" aria-hidden="true">
                            <UsersRound size={18} />
                          </span>
                          <p className="borrower-name">{borrower.fullName}</p>
                        </div>
                      </td>
                      <td>{borrower.creditScore ?? "N/A"}</td>
                      <td>
                        <span className="badge badge-gray">
                          <ShieldCheck size={14} /> {formatLabel(borrower.kycStatus)}
                        </span>
                      </td>
                      <td>{borrower.loanCount}</td>
                      <td>{formatCurrency(borrower.outstandingAmount)}</td>
                      <td>
                        <span className="badge badge-gray">
                          {formatLabel(borrower.latestLoanStatus)}
                        </span>
                      </td>
                      <td><ChevronRight size={18} aria-hidden="true" /></td>
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

      {selectedBorrowerId ? (
        <BorrowerSidePanel
          session={session}
          borrowerId={selectedBorrowerId}
          onClose={() => setSelectedBorrowerId(null)}
        />
      ) : null}
    </>
  );
}
