# Smart Credit+ Auth API Guide

This guide explains the current backend-owned auth flow used by Smart Credit+ before mobile integration.

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

## How This Project Authenticates Users

Smart Credit+ does not use Firebase Authentication for sign-in. Instead, the backend manages credentials inside the Firestore `users` collection.

On registration, the backend:

- normalizes the email to `emailLower`
- normalizes the phone to `phoneNormalized`
- hashes the plaintext password with `bcrypt`
- stores the hash as `passwordHash`
- creates account metadata like `role`, `accountStatus`, `kycStatus`, and `authProvider`

On login, the backend:

- looks up the user by email or phone
- compares the submitted password against `passwordHash` with `bcrypt.compare`
- checks that the selected role is allowed for that user
- signs a JWT with `sub`, `email`, and `role`

The JWT is a signed access token. It is not a Firebase token and it is not a database session record. The frontend stores it locally and sends it back on every protected request.

## What The JWT Contains

Current JWT payload fields:

- `sub`: the Firestore user id
- `email`: the user email
- `role`: the active role for this session

`JwtStrategy` verifies the signature with `JWT_SECRET` and attaches the decoded payload to `req.user`.

`JwtAuthGuard` rejects missing or invalid tokens with `401 Unauthorized`.

`RolesGuard` rejects valid tokens that use the wrong role for a route with `403 Forbidden`.

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

Stored Firestore shape includes fields like:

- `uid`
- `role`
- `fullName`
- `email`
- `emailLower`
- `phone`
- `phoneNormalized`
- `passwordHash`
- `accountStatus`
- `kycStatus`
- `authProvider`
- `createdAt`
- `updatedAt`

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

Accepts either email or phone as `identifier`. The selected `role` is required and becomes part of the signed JWT payload for that session.

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

Use the backend seed path for local demo data:

```bash
cd Backend
node seed-mock-data-with-lenderborrowers.js --key=../key/snap-221f4-firebase-adminsdk-fbsvc-14aca60c6f.json
```

If you already have older seeded users without auth fields, backfill them with:

```bash
cd Backend
npm run backfill:auth-users
```

Seeded and backfilled users should contain:

- `passwordHash`
- `emailLower`
- `phoneNormalized`
- `accountStatus`
- `authProvider`

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
