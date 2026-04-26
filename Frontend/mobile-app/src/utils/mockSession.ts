/** @format */

import { saveAuthSession } from "./auth.storage";

// Call this once at the top of App.tsx during development
export async function setupMockSession() {
  await saveAuthSession({
    token: "dev-token-bypass",
    userId: "borrower_001",
    role: "borrower",
  });
}
