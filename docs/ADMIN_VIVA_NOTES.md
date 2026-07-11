# Admin Module Viva Notes

## My Contribution

I worked on the admin module of the Smart Credit system. My contribution covers admin authentication, protected admin routes, user management, KYC review, lender ad moderation, and audit log viewing. The frontend consumes the backend APIs and the backend uses Firebase Firestore for persistence.

## Architecture Overview

The admin module follows a clear separation of concerns:

- Controller: receives HTTP requests and returns responses
- Service: contains the business logic
- DTO: validates request input
- Guard: protects admin-only endpoints using JWT
- Frontend pages: display data and trigger actions through API utilities

## Request Flow

The request flow is:

1. Admin interacts with a frontend page such as Manage Users.
2. The page calls a helper in `src/lib/api.ts`.
3. The API helper sends an HTTP request to the NestJS backend.
4. The backend controller receives the request.
5. The `AdminJwtGuard` verifies the JWT token and admin role.
6. The service performs the business logic.
7. Firebase Firestore stores or returns the data.
8. The result is returned to the frontend and rendered in the UI.

## Authentication

Admin login works by checking the email in the Firestore `users` collection, verifying that the user's role is `admin`, and comparing the plain text password with the stored `passwordHash` using `bcrypt`. If valid, the backend creates a JWT token and returns it to the frontend.

The frontend stores the token in local storage and sends it in the `Authorization` header for protected requests.

## Authorization

Protected admin endpoints use `@UseGuards(AdminJwtGuard)`. The guard checks whether:

- the request has a bearer token
- the JWT token is valid
- the decoded payload contains the `admin` role

If any of these checks fail, the backend returns `401 Unauthorized`.

## User Management

The user management page supports:

- viewing all users
- loading user statistics
- searching and filtering users
- viewing user details
- suspending users
- activating suspended users

Sensitive fields such as `passwordHash` are removed before user records are returned to the frontend.

## KYC Review

The KYC page loads verification records and lets the admin approve or reject them. After an action is completed, the page updates the local state so the change is immediately visible in the UI.

## Lender Ad Moderation

The lender ads page loads ad records from the backend and allows the admin to approve or reject pending ads. It also provides filtering and a detail modal for easier review.

## Audit Logs

The audit log page shows an activity feed derived from Firestore data. It combines records from users, KYC documents, ads, and disputes. The frontend allows search, severity filtering, and CSV export.

## Error Handling

Error handling is done in multiple layers:

- DTO validation checks invalid input
- Guards handle unauthorized access
- Services throw `NotFoundException`, `UnauthorizedException`, or `InternalServerErrorException`
- Frontend catches errors and displays readable messages

## Data Types

TypeScript types are used to keep the code safer and easier to understand:

- union types are used for statuses and roles
- interfaces are used for API payloads
- optional fields are used where Firestore records may or may not contain a value

Example:

- `role` is a union type because it should only be `admin`, `borrower`, or `lender`
- `status` is optional because some records may be incomplete or older data may not contain every field

## Coding Standards Applied

The admin code follows these standards:

- meaningful names for files, functions, and variables
- controller and service separation
- environment-based config instead of hardcoded URLs or secrets where possible
- concise comments for important functions
- readable helper functions for formatting and mapping data

## Known Limitations

- some Firestore filtering is still done in memory after fetching records
- audit logs are generated from existing data rather than stored as an immutable audit trail
- deleting a Firestore user document does not necessarily remove a Firebase Authentication account if one exists separately

## Common Viva Questions

### What did you contribute?

I implemented the admin module features including authentication, protected routes, user management, KYC review, lender ad moderation, and audit log viewing, along with the related frontend pages and API integration.

### Why did you use controllers and services separately?

Controllers should focus on handling HTTP requests and responses, while services should handle business logic. This makes the code easier to maintain, test, and explain.

### Why use DTOs?

DTOs help validate request data before it reaches the business logic. This improves reliability and prevents invalid input from being processed.

### Why use JWT?

JWT allows stateless authentication. After login, the token can be verified on each request without storing a server-side session.

### Why use a guard?

A guard centralizes authorization logic, so admin-only checks do not need to be repeated inside every controller method.

### Why remove `passwordHash` from responses?

It is sensitive information and should never be exposed to the frontend. Sanitizing the user record improves security.

### How are errors handled?

The backend uses NestJS exceptions such as `UnauthorizedException`, `NotFoundException`, and `InternalServerErrorException`. The frontend catches these responses and shows readable messages to the user.

### What would you improve next?

I would improve Firestore query efficiency, add more automated tests, and create a more persistent audit trail instead of deriving logs dynamically from multiple collections.
