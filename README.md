# Smart Credit+ Auth MVP

This workspace contains the first authentication milestone for Smart Credit+:

- `apps/backend` - NestJS API for register, login, and `me`
- `apps/web-admin` - React + Vite web app with a combined register/login page

## What This MVP Does

- Creates users in Firestore inside the `users` collection
- Keeps the seed-script shape and adds auth fields like `passwordHash`
- Lets users register as `borrower` or `lender`
- Lets users log in with email or phone plus a selected role
- Returns a JWT from the backend
- Shows a simple success state in the web app after login

## Quick Start

1. Install dependencies from the repo root:

```bash
npm install
```

2. Copy the example env files and fill them in:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/web-admin/.env.example apps/web-admin/.env
```

3. Start the backend:

```bash
npm run dev:backend
```

4. Start the web app in a second terminal:

```bash
npm run dev:web
```

## Firebase Setup

The backend uses Firebase Admin SDK. Configure one of these in `apps/backend/.env`:

- `FIREBASE_SERVICE_ACCOUNT_PATH`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

You also need a `JWT_SECRET`.

## Useful Scripts

- `npm run dev:backend`
- `npm run dev:web`
- `npm run build:backend`
- `npm run build:web`
- `npm run build`

