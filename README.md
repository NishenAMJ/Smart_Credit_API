# Smart Credit+ Auth Integration

This branch now follows the team folder structure:

- `Backend` - NestJS API with JWT auth, role guards, Firestore users, and admin login support
- `Frontend/mobile-app` - team React Native app restored from `origin/dev`
- `docs` - auth API handoff notes for teammates

## Backend Quick Start

1. Install backend dependencies:

```bash
cd Backend
npm install
```

2. Copy the backend env file and fill Firebase/JWT values:

```bash
cp .env.example .env
```

3. Start the backend:

```bash
npm run start:dev
```

Local API base URL:

```text
http://127.0.0.1:3000/api
```

## Auth Features

- Public registration for `borrower` and `lender`
- Login for `borrower`, `lender`, and `admin`
- Password hashing with bcrypt
- JWT access tokens
- Firestore `users` collection compatibility
- Role guards for borrower, lender, and admin routes
- Admin dashboard endpoint for account and KYC review visibility

## Role-Protected Auth Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/session`
- `GET /api/auth/dashboard`
- `GET /api/auth/borrower/dashboard` - borrower token only
- `GET /api/auth/lender/dashboard` - lender token only
- `GET /api/auth/admin/dashboard` - admin token only

## Useful Backend Scripts

Create an admin account intentionally, not through public registration:

```bash
cd Backend
npm run create:admin -- --email=admin@smartcredit.lk --password=StrongPass123 --full-name="System Admin" --phone=+94770000000
```

Backfill seeded Firestore users with auth fields:

```bash
cd Backend
npm run backfill:auth-users
```

Dry run:

```bash
cd Backend
npm run backfill:auth-users -- --dry-run
```

Default seeded-user password:

```text
SmartCredit@123
```

Detailed teammate docs:

- `docs/auth-api.md`
- `Backend/Smart_Credit_Auth.postman_collection.json`
