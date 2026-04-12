# Admin Module Demo Script

## Demo Goal
Show that the Smart Credit+ admin module can authenticate an admin user, monitor platform activity, manage users, review KYC, moderate lender ads, view audit logs, and access analytics using the live NestJS backend and Firebase data.

## Before the Demo
1. Start the backend:
```bash
cd '/Users/lumithmanujaya/Desktop/Smart credit/Smart_Credit_API/Backend'
npm run start:dev
```

2. Start the admin frontend:
```bash
cd '/Users/lumithmanujaya/Desktop/Smart credit/Smart_Credit_API/Admin frontend'
npm run dev
```

3. Open:
```text
http://localhost:5173/signin
```

4. Login credentials:
```text
Email: sarah.admin@example.com
Password: admin123
```

## Demo Flow

### 1. Admin Login
Explain:
- The admin signs in through the React admin dashboard.
- The frontend sends the credentials to the NestJS backend.
- The backend validates the admin account from Firebase and returns a JWT token.
- Protected pages are only accessible after successful login.

Show:
- Sign-in page
- Successful redirect to dashboard

### 2. Dashboard
Explain:
- The dashboard loads live summary data from the backend.
- It shows platform-level monitoring information such as total users, total loans, total revenue, active disputes, and recent activity.

Show:
- Total users
- Total loans
- Total revenue
- Alerts section

### 3. Manage Users
Explain:
- The admin can view all registered users.
- User records are loaded from Firebase through secured NestJS endpoints.
- The admin can suspend and reactivate accounts.

Show:
- User list
- Search and filtering
- Open one user detail modal
- Suspend a user
- Reactivate a suspended user

### 4. KYC Approvals
Explain:
- KYC records are fetched from Firebase.
- The admin can review submissions and approve or reject pending KYC documents.

Show:
- Pending KYC records
- Open a KYC detail modal
- Approve one record or reject one record

### 5. Lender Ads
Explain:
- Lender and borrower ads are stored in Firebase.
- The admin can review ad requests and approve or reject them.

Show:
- Ads list
- Pending ads
- Approve or reject one ad

### 6. Audit Logs
Explain:
- The audit log page gives a trace of important administrative activity.
- Logs are generated from Firebase-backed actions like KYC review, user moderation, and ad moderation.

Show:
- Severity cards
- Search
- Open one log entry

### 7. Analytics
Explain:
- The analytics page pulls data from reports endpoints.
- It shows user, loan, transaction, and revenue summaries using live backend data.

Show:
- Revenue trend
- User breakdown
- Loan status table

## Key Technical Points to Mention
- Frontend: React + Vite + TypeScript
- Backend: NestJS
- Database: Firebase Firestore
- Auth: JWT-based admin login
- Security: Protected admin routes with admin JWT guard
- Architecture: Frontend calls NestJS REST APIs, NestJS reads/writes Firebase data

## Short Demo Closing
This admin module provides secure platform oversight for Smart Credit+. It supports authentication, live monitoring, user moderation, KYC verification, ad moderation, audit visibility, and analytics, all integrated with NestJS and Firebase.
