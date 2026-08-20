import {
  buildPageInfo,
  decodeCursor,
} from '../../../firebase/firestore-query.utils';
import {
  CursorPageInfo,
  DashboardBorrower,
} from './dashboard.types';

export type DashboardBorrowerPageItem = DashboardBorrower & {
  cursorDate: Date | null;
  cursorId: string;
};

export function normalizeBorrowerSearch(
  search?: string | null,
): string | null {
  if (typeof search !== 'string') return null;
  const normalized = search
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, ' ');
  return normalized.length > 0 ? normalized : null;
}

export function borrowerMatchesSearch(
  borrower: DashboardBorrower,
  searchTerm: string,
): boolean {
  const searchTerms = searchTerm.split(/\s+/).filter(Boolean);
  const searchTokens = Array.from(
    new Set(
      [borrower.fullName, borrower.email]
        .flatMap((value) =>
          value.trim().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
        )
        .filter(Boolean),
    ),
  );
  return searchTerms.every((term) =>
    searchTokens.some((token) => token.startsWith(term)),
  );
}

export function createEmptyPageInfo(pageSize: number): CursorPageInfo {
  return { pageSize, hasMore: false, nextCursor: null };
}

export function paginateBorrowerItems(
  borrowers: DashboardBorrowerPageItem[],
  pageSize: number,
  cursor?: string | null,
): { borrowers: DashboardBorrower[]; pageInfo: CursorPageInfo } {
  const decodedCursor = decodeCursor(cursor);
  const startIndex = decodedCursor
    ? borrowers.findIndex((borrower) => {
        const borrowerTime = borrower.cursorDate?.getTime() ?? 0;
        const cursorTime = decodedCursor.date.getTime();
        return (
          borrowerTime < cursorTime ||
          (borrowerTime === cursorTime &&
            borrower.cursorId.localeCompare(decodedCursor.id) < 0)
        );
      })
    : 0;
  const safeStartIndex = startIndex < 0 ? borrowers.length : startIndex;
  const page = borrowers.slice(
    safeStartIndex,
    safeStartIndex + pageSize + 1,
  );
  const visible = page.slice(0, pageSize);

  return {
    borrowers: visible.map(
      ({ cursorDate: _cursorDate, cursorId: _cursorId, ...borrower }) =>
        borrower,
    ),
    pageInfo: buildPageInfo(visible, pageSize, page.length > pageSize),
  };
}
