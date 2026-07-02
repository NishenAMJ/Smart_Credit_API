# Admin Module Test Cases

This document captures the core manual test scenarios for the Smart Credit admin module.

## Environment

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:3000`
- Database: Firebase Firestore
- Auth: JWT bearer token for protected admin routes

## Authentication

### TC-ADM-001: Admin login with valid credentials

- Objective: Verify that a valid admin can sign in.
- Preconditions: Admin user exists in Firestore with role `admin` and a valid `passwordHash`.
- Steps:
  1. Open the admin sign-in page.
  2. Enter a valid admin email and password.
  3. Submit the form.
- Expected result:
  - Backend returns `accessToken` and admin user payload.
  - Frontend stores the session in local storage.
  - User is redirected to the protected admin area.

### TC-ADM-002: Login with invalid password

- Objective: Verify invalid passwords are rejected.
- Preconditions: Admin user exists.
- Steps:
  1. Enter a valid admin email.
  2. Enter an incorrect password.
  3. Submit the form.
- Expected result:
  - Backend returns `401 Unauthorized`.
  - Error message indicates invalid credentials.
  - No session is stored.

### TC-ADM-003: Login with non-admin account

- Objective: Verify non-admin users cannot access admin features.
- Preconditions: User exists with role `borrower` or `lender`.
- Steps:
  1. Enter the non-admin email and valid password.
  2. Submit the form.
- Expected result:
  - Backend returns `401 Unauthorized`.
  - Error indicates it is not an admin account.

### TC-ADM-004: Access protected route without token

- Objective: Verify guard-based authorization.
- Steps:
  1. Call a protected endpoint such as `GET /admin/users` without an `Authorization` header.
- Expected result:
  - Backend returns `401 Unauthorized`.
  - Response message indicates the token is missing or invalid.

## User Management

### TC-ADM-005: Load user list

- Objective: Verify admins can view users.
- Steps:
  1. Sign in as an admin.
  2. Open the Manage Users page.
- Expected result:
  - Frontend calls `GET /admin/users`.
  - User records load into the table.
  - Sensitive fields such as `passwordHash` are not exposed.

### TC-ADM-006: Load user statistics

- Objective: Verify the dashboard cards show correct counts.
- Steps:
  1. Open the Manage Users page.
- Expected result:
  - Frontend calls `GET /admin/users/stats`.
  - Counts for total, active, pending, suspended, borrowers, and lenders are shown.

### TC-ADM-007: Suspend user

- Objective: Verify an admin can suspend a user.
- Preconditions: Target user exists and is not already suspended.
- Steps:
  1. Open Manage Users.
  2. Click suspend for a selected user.
- Expected result:
  - Backend updates user `status` to `suspended`.
  - `suspendedAt`, `suspensionReason`, and `updatedAt` are saved.
  - Frontend table updates to show suspended status.

### TC-ADM-008: Activate suspended user

- Objective: Verify an admin can reactivate a suspended user.
- Preconditions: Target user exists and is suspended.
- Steps:
  1. Open Manage Users.
  2. Click activate for the selected suspended user.
- Expected result:
  - Backend updates status to `active`.
  - Suspension fields are removed.
  - Frontend table updates accordingly.

### TC-ADM-009: Get user by invalid id

- Objective: Verify missing users are handled safely.
- Steps:
  1. Call `GET /admin/users/{invalidUserId}` with a non-existent id.
- Expected result:
  - Backend returns `404 Not Found`.
  - Message indicates user was not found.

### TC-ADM-010: Delete user

- Objective: Verify a user document can be removed.
- Preconditions: Target user exists.
- Steps:
  1. Call `DELETE /admin/users/{userId}`.
- Expected result:
  - Backend deletes the Firestore document.
  - Success response includes deleted `userId`.

## KYC Review

### TC-ADM-011: Load KYC records

- Objective: Verify KYC submissions are visible to the admin.
- Steps:
  1. Open the KYC Approvals page.
- Expected result:
  - Frontend calls `GET /admin/kyc/pending`.
  - Table shows returned documents.

### TC-ADM-012: Approve KYC record

- Objective: Verify KYC approval works.
- Preconditions: Document exists with `pending` status.
- Steps:
  1. Open KYC Approvals.
  2. Click approve on a pending record.
- Expected result:
  - Backend updates the record to `approved`.
  - Frontend updates the row status.

### TC-ADM-013: Reject KYC record

- Objective: Verify KYC rejection works.
- Preconditions: Document exists with `pending` status.
- Steps:
  1. Open KYC Approvals.
  2. Click reject on a pending record.
- Expected result:
  - Backend updates the record to `rejected`.
  - Frontend updates the row status.

## Lender Ad Moderation

### TC-ADM-014: Load ad list

- Objective: Verify admin can review lender ads.
- Steps:
  1. Open the Lender Ads page.
- Expected result:
  - Frontend calls `GET /admin/ads`.
  - Ads are shown in the moderation table.

### TC-ADM-015: Approve ad

- Objective: Verify approval of a pending ad.
- Preconditions: Pending ad exists.
- Steps:
  1. Open Lender Ads.
  2. Click approve on a pending ad.
- Expected result:
  - Backend updates status to `approved`.
  - Frontend updates the row status.

### TC-ADM-016: Reject ad

- Objective: Verify rejection of a pending ad.
- Preconditions: Pending ad exists.
- Steps:
  1. Open Lender Ads.
  2. Click reject on a pending ad.
- Expected result:
  - Backend updates status to `rejected`.
  - Frontend updates the row status.

## Audit Logs

### TC-ADM-017: Load audit logs

- Objective: Verify the admin activity feed is displayed.
- Steps:
  1. Open the Audit Logs page.
- Expected result:
  - Frontend calls `GET /admin/audit-logs`.
  - Log entries are sorted and displayed.

### TC-ADM-018: Export audit logs

- Objective: Verify filtered logs can be exported.
- Steps:
  1. Open Audit Logs.
  2. Apply a search or severity filter.
  3. Click Export CSV.
- Expected result:
  - Browser downloads a CSV file with the currently visible rows.

## Error Handling and Validation Checks

### TC-ADM-019: Invalid login payload

- Objective: Verify DTO validation rejects bad input.
- Steps:
  1. Send login request with invalid email format or missing password.
- Expected result:
  - Backend validation fails.
  - Appropriate error response is returned.

### TC-ADM-020: Invalid query filter values

- Objective: Verify query DTO validation prevents unsupported filters.
- Steps:
  1. Call `GET /admin/users?role=randomRole`.
- Expected result:
  - Backend validation fails because `role` must match allowed values.

## Evidence To Capture

- Screenshots of each page after successful load
- Screenshot of successful admin login
- Screenshot of invalid login error
- Screenshot of suspend, activate, approve, and reject actions
- Screenshot or exported file for audit log CSV
- API responses from browser devtools or Postman where relevant
