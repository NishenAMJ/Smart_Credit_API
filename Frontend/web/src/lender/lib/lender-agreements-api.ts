// Thin lender-specific wrapper around the shared legal agreements experience.
import { fetchLenderApi, parseApiError } from "./api-client";
import type { AgreementsResponse } from "../../legal/types";

export const LenderAgreementsApi = {
  // Reuses the authenticated lender session to fetch only agreements the lender is allowed to see.
  getLegalAgreements: async (): Promise<AgreementsResponse> => {
    const response = await fetchLenderApi("/legal/documents", {
      method: "GET",
    });

    if (!response.ok) {
      return parseApiError(response, "Failed to load legal agreements");
    }

    return response.json() as Promise<AgreementsResponse>;
  },
};
