/** @format */

import type { BorrowerNavigation } from "../types/navigation";

export type BorrowerTabRoute =
  | "Home"
  | "Loans"
  | "Payments"
  | "Support"
  | "Profile";

/**
 * Routes to a borrower tab from either a tab screen or a stacked detail screen.
 */
export function navigateToBorrowerTab(
  navigation: BorrowerNavigation,
  screen: BorrowerTabRoute,
  params?: any,
) {
  (navigation as any).navigate("BorrowerTabs", { screen, params });
}
