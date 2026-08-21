import { expect, test } from "@playwright/test";

test("shared sign-in validates required credentials", async ({ page }) => {
  await page.goto("/signin");
  await page
    .locator("form")
    .getByRole("button", { name: "Log In", exact: true })
    .click();

  await expect(page.getByText("Email or phone is required.")).toBeVisible();
  await expect(page.getByText("Password is required.")).toBeVisible();
});

test("admin sign-in stores the session and opens the admin workspace", async ({
  page,
}) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "admin-e2e-token",
        availableRoles: ["admin"],
        user: {
          uid: "admin-e2e",
          userId: "admin-e2e",
          fullName: "Workflow Admin",
          email: "admin@example.test",
          phone: "+94770000000",
          role: "admin",
          kycStatus: "approved",
        },
      }),
    });
  });
  await page.route("**/api/admin/dashboard**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        stats: {},
        recentActivity: [],
      }),
    });
  });

  await page.goto("/signin");
  await page.getByLabel("Email or phone").fill("admin@example.test");
  await page.getByPlaceholder("Enter your password").fill("Password123!");
  await page
    .locator("form")
    .getByRole("button", { name: "Log In", exact: true })
    .click();

  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("adminToken")))
    .toBe("admin-e2e-token");
});

test("KYC review groups files by user and preserves all status counters", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("adminToken", "admin-e2e-token");
    localStorage.setItem(
      "adminUser",
      JSON.stringify({
        uid: "admin-e2e",
        fullName: "Workflow Admin",
        role: "admin",
      }),
    );
  });
  await page.route("**/api/admin/kyc/pending**", async (route) => {
    const common = {
      userId: "borrower-1",
      fullName: "Grouped Borrower",
      email: "borrower@example.test",
      phone: "+94770000001",
      status: "pending",
      documentStatus: "pending_review",
      userKycStatus: "pending",
      submittedAt: { _seconds: 1_700_000_000 },
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        count: 3,
        summary: { total: 9, pending: 3, approved: 4, rejected: 2 },
        documents: [
          {
            ...common,
            id: "front",
            documentType: "nic_front",
            originalFilename: "front.jpg",
          },
          {
            ...common,
            id: "back",
            documentType: "nic_back",
            originalFilename: "back.jpg",
          },
          {
            ...common,
            id: "selfie",
            documentType: "selfie",
            originalFilename: "selfie.jpg",
          },
        ],
      }),
    });
  });

  await page.goto("/admin/kyc");

  await expect(
    page.getByRole("heading", { name: "KYC Reviews" }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("3 documents");
  await expect(page.locator("tbody tr")).toContainText(
    "nic front, nic back, selfie",
  );

  for (const [label, value] of [
    ["Total", "9"],
    ["Pending", "3"],
    ["Approved", "4"],
    ["Rejected", "2"],
  ] as const) {
    await expect(
      page.locator(".card").filter({ hasText: label }).getByText(value),
    ).toBeVisible();
  }
});

test("admin disputes use global counts for every active workflow status", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("adminToken", "admin-e2e-token");
    localStorage.setItem(
      "adminUser",
      JSON.stringify({ uid: "admin-e2e", fullName: "Workflow Admin", role: "admin" }),
    );
  });
  await page.route("**/api/admin/disputes/stats", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        stats: {
          all: 11,
          open: 2,
          under_review: 3,
          awaiting_response: 1,
          escalated: 2,
          resolved: 2,
          closed: 1,
        },
      }),
    }),
  );
  await page.route(/\/api\/admin\/disputes(?:\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        count: 1,
        hasMore: false,
        disputes: [
          {
            id: "dispute-1",
            disputeCode: "DSP-0001",
            loanId: "loan-1",
            complainantId: "borrower-1",
            respondentId: "lender-1",
            borrowerId: "borrower-1",
            lenderId: "lender-1",
            borrowerName: "Borrower One",
            lenderName: "Lender One",
            subject: "Payment was not reflected",
            description: "The completed payment is missing.",
            category: "payment",
            priority: "high",
            status: "open",
            evidenceDocumentIds: [],
            createdAt: new Date("2026-08-21T10:00:00.000Z").toISOString(),
          },
        ],
      }),
    }),
  );

  await page.goto("/admin/disputes");
  await expect(page.getByRole("heading", { name: "Disputes" })).toBeVisible();
  await expect(page.getByText("Payment was not reflected")).toBeVisible();

  for (const [label, value] of [
    ["All Disputes", "11"],
    ["Open", "2"],
    ["In Progress", "4"],
    ["Escalated", "2"],
    ["Resolved", "2"],
  ] as const) {
    await expect(
      page.locator(".card").filter({ hasText: label }).getByText(value),
    ).toBeVisible();
  }
});
