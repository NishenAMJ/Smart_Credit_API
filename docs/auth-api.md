# Smart Credit+ Auth API Guide

This guide is for teammates using the auth backend before mobile integration.

## Base URL

Local development:

```text
http://127.0.0.1:3000/api
```

## Authentication Flow

1. Register with `POST /auth/register`
2. Log in with `POST /auth/login`
3. Save the returned `accessToken`
4. Send `Authorization: Bearer <accessToken>` on protected requests
5. Use `GET /auth/session` to confirm the current token and role

## Roles

Supported roles in this auth MVP:

- `borrower`
- `lender`
- `admin`

Public registration only allows borrower and lender accounts. Admin accounts must be created through the backend script, then they can log in through the same login endpoint.

## Endpoints

### `POST /auth/register`

Creates a Firestore `users` document and stores a hashed password.

Request:

```json
{
  "fullName": "Auth Demo User",
  "email": "auth.demo@example.com",
  "phone": "+947700000000",
  "password": "DemoPass123",
  "role": "borrower"
}
```

Response:

```json
{
  "message": "Account created successfully. Please log in to continue.",
  "user": {
    "uid": "generatedUserId",
    "fullName": "Auth Demo User",
    "email": "auth.demo@example.com",
    "phone": "+947700000000",
    "role": "borrower",
    "kycStatus": "not_submitted"
  }
}
```

### `POST /auth/login`

Accepts either email or phone as `identifier`.

Request:

```json
{
  "identifier": "auth.demo@example.com",
  "password": "DemoPass123",
  "role": "borrower"
}
```

Response:

```json
{
  "accessToken": "jwt-token-here",
  "user": {
    "uid": "generatedUserId",
    "fullName": "Auth Demo User",
    "email": "auth.demo@example.com",
    "phone": "+947700000000",
    "role": "borrower",
    "kycStatus": "not_submitted"
  }
}
```

### `GET /auth/me`

Returns the safe user profile for the authenticated token.

### `GET /auth/session`

Use this to confirm:

- current active role
- available roles
- account status
- KYC status

Example response:

```json
{
  "message": "Authenticated session is valid.",
  "activeRole": "borrower",
  "availableRoles": ["borrower"],
  "accountStatus": "active",
  "kycStatus": "approved",
  "user": {
    "uid": "borrower_001",
    "fullName": "Nadeesha Fernando",
    "email": "nadeesha.fernando.b01@smartcredit.lk",
    "phone": "+94710003723",
    "role": "borrower",
    "kycStatus": "approved"
  }
}
```

### `GET /auth/borrower/dashboard`

Protected route for borrower tokens only.

### `GET /auth/lender/dashboard`

Protected route for lender tokens only.

### `GET /auth/admin/dashboard`

Protected route for admin tokens only. This gives Manujaya's admin side a review workspace for user and KYC state.

### `GET /auth/dashboard`

Generic protected dashboard endpoint. The web app currently prefers the role-specific route after confirming the session role.

## Common Errors

`401 Unauthorized`

- wrong password
- wrong email/phone
- expired or missing token

`403 Forbidden`

- token is valid but the role does not match the route

Example:

```json
{
  "message": "This route requires one of these roles: lender.",
  "error": "Forbidden",
  "statusCode": 403
}
```

## Admin Account Creation

Create admin accounts with the backend script instead of the public register form:

```bash
cd Backend && npm run create:admin -- --email=admin@smartcredit.lk --password=StrongPass123 --full-name="System Admin" --phone=+94770000000
```

The current demo admin account created for local testing is:

```text
admin@smartcredit.lk
```

## Seeded Firestore Accounts

Existing seeded users were backfilled with auth fields.

Shared seeded-user password:

```text
SmartCredit@123
```

Verified examples:

- Borrower: `nadeesha.fernando.b01@smartcredit.lk`
- Lender: `kamal.rathnayake.l01@smartcredit.lk`

## Postman

Import this collection:

```text
Backend/Smart_Credit_Auth.postman_collection.json
```

Set collection variable:

```text
baseUrl = http://127.0.0.1:3000/api
```

Log in first, then paste the returned token into the `bearerToken` collection variable.

