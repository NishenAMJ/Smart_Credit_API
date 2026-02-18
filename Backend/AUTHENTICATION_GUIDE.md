# Authentication System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [API Endpoints](#api-endpoints)
4. [Security Features](#security-features)
5. [Testing Guide](#testing-guide)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The Smart Credit+ platform uses **JWT (JSON Web Token) authentication** with role-based access control. The authentication system is fully integrated with the lender module to provide secure user registration, login, and protected API endpoints.

### Key Technologies
- **JWT Tokens**: For stateless authentication
- **bcrypt**: For password hashing (10 rounds)
- **Passport.js**: Authentication middleware
- **Role-Based Access Control**: Lender/Borrower isolation

### Database Collections
- `users`: Stores authentication credentials (email, hashedPassword, role)
- `lenders`: Stores lender profile information
- `borrowers`: Stores borrower profile information
- `loanOffers`: Stores loan offers created by lenders

---

## Authentication Flow

### 1. Registration Flow
```
User submits → Validate input → Hash password → Create user document 
→ Create role-based profile (lender/borrower) → Link profileId to user 
→ Generate JWT token → Return token + user info
```

**Example Request:**
```json
POST /auth/register
{
  "email": "sarah@example.com",
  "password": "SecurePass123!",
  "role": "lender",
  "name": "Sarah Johnson",
  "phone": "+1-555-0123"
}
```

**Example Response:**
```json
{
  "user": {
    "id": "user123",
    "email": "sarah@example.com",
    "role": "lender",
    "profileId": "lender456",
    "isActive": true,
    "createdAt": "2025-01-29T10:00:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Login Flow
```
User submits credentials → Find user by email → Validate password with bcrypt 
→ Generate JWT token → Return token + user info
```

**Example Request:**
```json
POST /auth/login
{
  "email": "sarah@example.com",
  "password": "SecurePass123!"
}
```

**Example Response:**
```json
{
  "user": {
    "id": "user123",
    "email": "sarah@example.com",
    "role": "lender",
    "profileId": "lender456"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Accessing Protected Endpoints
```
Include JWT token in Authorization header → Extract and validate token 
→ Load user from database → Check user role → Allow/Deny access
```

**Example Request:**
```bash
GET /lender/lender456/dashboard
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## API Endpoints

### Authentication Endpoints

#### Register New User
```http
POST /auth/register
Content-Type: application/json

Body:
{
  "email": string,           // Valid email address
  "password": string,        // Min 6 characters
  "role": "lender" | "borrower",
  "name": string,
  "phone": string (optional)
}

Response: 201 Created
{
  "user": AuthUser,
  "access_token": string
}

Errors:
- 400 Bad Request: Invalid input or email already exists
```

#### Login
```http
POST /auth/login
Content-Type: application/json

Body:
{
  "email": string,
  "password": string
}

Response: 200 OK
{
  "user": AuthUser,
  "access_token": string
}

Errors:
- 401 Unauthorized: Invalid credentials
```

#### Get Profile (Protected)
```http
GET /auth/profile
Authorization: Bearer {token}

Response: 200 OK
{
  "user": {
    "id": string,
    "email": string,
    "role": string,
    "profileId": string,
    "isActive": boolean,
    "createdAt": string
  },
  "profile": {
    // Lender or Borrower profile data
  }
}

Errors:
- 401 Unauthorized: Missing or invalid token
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer {token}

Response: 200 OK
{
  "message": "Logout successful"
}

Note: JWT tokens are stateless, so logout is client-side (delete token)
```

### Protected Lender Endpoints

All lender endpoints require:
- Valid JWT token in Authorization header
- User role must be "lender"
- User can only access their own profile data

#### Create Lender Profile
```http
POST /lender
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "name": string,
  "email": string,
  "phone": string (optional),
  "address": string (optional),
  "panCard": string (optional),
  "aadharCard": string (optional),
  "bankAccountNumber": string (optional),
  "ifscCode": string (optional),
  "investmentCapacity": number (optional),
  "riskPreference": "low" | "medium" | "high" (optional)
}

Response: 201 Created
```

#### Get Lender Profile
```http
GET /lender/{lenderId}
Authorization: Bearer {token}

Response: 200 OK

Errors:
- 403 Forbidden: Cannot access other lender's profile
- 404 Not Found: Lender not found
```

#### Update Lender Profile
```http
PUT /lender/{lenderId}
Authorization: Bearer {token}
Content-Type: application/json

Body: (all fields optional)
{
  "name": string,
  "phone": string,
  "investmentCapacity": number,
  "riskPreference": "low" | "medium" | "high"
}

Response: 200 OK

Errors:
- 403 Forbidden: Cannot update other lender's profile
```

#### Create Loan Offer
```http
POST /lender/{lenderId}/offers
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "amount": number,                    // Loan amount
  "interestRate": number,              // Annual interest rate
  "tenure": number,                    // Tenure in months
  "minCreditScore": number (optional),
  "description": string (optional),
  "termsAndConditions": string (optional)
}

Response: 201 Created

Errors:
- 403 Forbidden: Cannot create offers for other lenders
```

#### Get Loan Offers
```http
GET /lender/{lenderId}/offers
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "id": string,
    "lenderId": string,
    "amount": number,
    "interestRate": number,
    "tenure": number,
    "status": "active" | "closed",
    "createdAt": string,
    "updatedAt": string
  }
]

Errors:
- 403 Forbidden: Cannot view other lender's offers
```

#### Update Loan Offer
```http
PUT /lender/{lenderId}/offers/{offerId}
Authorization: Bearer {token}
Content-Type: application/json

Body: (all fields optional)
{
  "amount": number,
  "interestRate": number,
  "status": "active" | "closed"
}

Response: 200 OK

Errors:
- 403 Forbidden: Cannot update other lender's offers
```

#### Get Dashboard Stats
```http
GET /lender/{lenderId}/dashboard
Authorization: Bearer {token}

Response: 200 OK
{
  "lenderId": string,
  "totalActiveOffers": number,
  "totalAmountOffered": number
}

Errors:
- 403 Forbidden: Cannot access other lender's dashboard
```

---

## Security Features

### 1. Password Security
- Passwords are hashed using **bcrypt** with 10 salt rounds
- Plain-text passwords are never stored in the database
- Password validation on login uses secure bcrypt comparison

### 2. JWT Token Security
- Tokens are signed with a secret key (`JWT_SECRET` in .env)
- Token expiration: 24 hours (configurable via `JWT_EXPIRATION`)
- Tokens include: userId, email, role in the payload
- Tokens are validated on every protected endpoint request

### 3. Role-Based Access Control (RBAC)
- Users have roles: `lender` or `borrower`
- Lender endpoints are protected with `@Roles('lender')` decorator
- RolesGuard checks user role from JWT token against required roles
- Unauthorized role access returns 403 Forbidden

### 4. User Isolation
- Lenders can only access/modify their own profile and offers
- Controller methods check if `req.user.profileId === lenderId`
- Attempts to access other users' data return 403 Forbidden

### 5. Input Validation
- All DTOs use `class-validator` decorators
- Email format validation
- Password minimum length (6 characters)
- Required field validation
- Invalid input returns 400 Bad Request

### 6. Token Transmission
- Tokens must be sent in `Authorization: Bearer {token}` header
- Tokens are not exposed in URL query parameters
- HTTPS should be used in production

---

## Testing Guide

### Using the PowerShell Test Script

1. **Start the Server:**
   ```powershell
   npm run start:dev
   ```

2. **Run the Test Script:**
   ```powershell
   .\test-auth-flow.ps1
   ```

3. **Expected Results:**
   - ✓ User registration successful with JWT token
   - ✓ Login successful with credentials
   - ✓ Protected endpoints accessible with valid token
   - ✓ Unauthorized access blocked (401)
   - ✓ Cross-user access blocked (403)

### Manual Testing with Postman

1. **Register a Lender:**
   - POST `http://localhost:3000/auth/register`
   - Body: `{ "email": "test@example.com", "password": "Pass123!", "role": "lender", "name": "Test Lender" }`
   - Copy the `access_token` from response

2. **Set Token in Postman:**
   - Go to Authorization tab
   - Select "Bearer Token"
   - Paste the `access_token`

3. **Test Protected Endpoints:**
   - GET `/auth/profile` - Should return user + profile
   - POST `/lender/{profileId}/offers` - Should create loan offer
   - GET `/lender/{profileId}/dashboard` - Should return dashboard stats

### Using cURL

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123!","role":"lender","name":"Test Lender"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123!"}'

# Get Profile (replace {TOKEN} with your JWT token)
curl http://localhost:3000/auth/profile \
  -H "Authorization: Bearer {TOKEN}"

# Create Loan Offer
curl -X POST http://localhost:3000/lender/{LENDER_ID}/offers \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"amount":100000,"interestRate":12,"tenure":24}'
```

---

## Troubleshooting

### Common Issues

#### 1. "401 Unauthorized" on Protected Endpoints
**Cause:** Missing or invalid JWT token
**Solution:**
- Ensure Authorization header is set: `Authorization: Bearer {token}`
- Check token is not expired (24 hour limit)
- Login again to get a fresh token

#### 2. "403 Forbidden" when accessing lender endpoints
**Cause:** Trying to access another user's profile
**Solution:**
- Verify you're using the correct lenderId from your JWT payload
- Check `req.user.profileId` matches the lenderId in the URL
- Use GET `/auth/profile` to find your correct profileId

#### 3. "400 Bad Request - Email already exists"
**Cause:** Attempting to register with an existing email
**Solution:**
- Use a different email address
- Or login with existing credentials

#### 4. "401 Unauthorized - Invalid credentials"
**Cause:** Wrong email or password during login
**Solution:**
- Verify email and password are correct
- Passwords are case-sensitive

#### 5. Token Not Being Sent
**Cause:** Authorization header not configured correctly
**Solution:**
- Header format: `Authorization: Bearer {token}`
- No quotes around the token
- Include the word "Bearer" with a space before the token

#### 6. Server Connection Errors
**Cause:** Server not running or wrong port
**Solution:**
```powershell
# Start server
npm run start:dev

# Verify server is running on port 3000
# Check console for "Application is running on: http://localhost:3000"
```

### Environment Variables

Ensure these variables are set in `.env`:
```env
# Firebase Configuration
FIREBASE_PROJECT_ID=smart-credit-plus-427004
FIREBASE_PRIVATE_KEY=<your-key>
FIREBASE_CLIENT_EMAIL=<your-email>
FIREBASE_DATABASE_URL=https://smart-credit-plus-427004.firebaseio.com

# Authentication
API_KEY=your-api-key-here
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=24h
```

### Debug Mode

Enable detailed logging:
```typescript
// In main.ts, add:
app.useLogger(['log', 'debug', 'error', 'warn']);
```

---

## Demo Checklist for Interview

- [ ] Server running successfully
- [ ] Test script executes without errors
- [ ] Can register new lender via API
- [ ] Can login and receive JWT token
- [ ] Can access protected endpoints with token
- [ ] Unauthorized access is blocked (401)
- [ ] Cross-user access is blocked (403)
- [ ] Can explain JWT token structure
- [ ] Can explain password hashing with bcrypt
- [ ] Can demonstrate role-based access control
- [ ] Understand the authentication flow diagram

---

## Summary

The authentication system provides:
✅ Secure user registration with password hashing
✅ JWT-based authentication (stateless)
✅ Role-based access control (lender/borrower)
✅ User isolation (cannot access other users' data)
✅ Protected API endpoints
✅ 24-hour token expiration
✅ Comprehensive error handling

This ensures that only authenticated lenders can access their own profiles, create loan offers, and view their dashboard - providing a secure multi-tenant platform.
