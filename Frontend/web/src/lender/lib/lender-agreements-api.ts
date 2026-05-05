import { fetchLenderApi, parseApiError } from "./api-client";
import type { AgreementsResponse } from "../../legal/types";

export const LenderAgreementsApi = {
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
