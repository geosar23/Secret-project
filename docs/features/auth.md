# Authentication

## Overview

The application uses **JWT (JSON Web Token)** based authentication. There are no sessions or cookies — every request is stateless.

---

## Login Flow

1. Client sends `POST /api/auth/login` with `{ email, password }`.
2. Server looks up the user by email (company-agnostic at this step).
3. Password is verified using **bcryptjs** against the stored hash.
4. On success, the server signs a JWT containing:
    - `id` — user's MongoDB `_id`
    - `companyId` — company's MongoDB `_id`
    - `iat` / `exp` — issued-at / expiry (added automatically by the JWT library)
5. The token is returned to the client.

Failure cases return `401 Unauthorized` with a generic message — no information leakage about whether the email or password was wrong.

---

## Token Usage

- The Angular app stores the token and attaches it automatically to every outbound HTTP request via an **HTTP interceptor** (`client/src/app/core/interceptors/`).
- The header format is: `Authorization: Bearer <token>`

---

## Server-Side Verification

Every protected Express route passes through `auth.middleware.ts`:

1. Extracts the `Bearer` token from the `Authorization` header.
2. Verifies the signature using `JWT_SECRET`.
3. Attaches the decoded payload to `req.user`.
4. Calls `next()` on success, or responds with `401` if the token is missing, malformed, or expired.

---

## Current User Context (`/me`)

`GET /api/auth/me` returns the full user object for the currently authenticated user. The Angular app calls this on startup (after finding a stored token) to rehydrate the session state without re-entering credentials.

---

## Security Notes

- `JWT_SECRET` must be a long, random string and must never be committed to source control.
- The hardcoded JWT fallback that existed in early versions of `auth.service.ts` has been removed. The server will refuse to start if `JWT_SECRET` is not set.
- Passwords are never stored in plain text. bcryptjs hashing is applied before any write to the database.
- Auth endpoint responses do not distinguish between "email not found" and "wrong password" to prevent user enumeration.

---

## Related Files

| File                                        | Purpose                                |
| ------------------------------------------- | -------------------------------------- |
| `server/src/middleware/auth.middleware.ts`  | JWT verification middleware            |
| `server/src/services/auth.service.ts`       | Login logic, token issuance            |
| `server/src/controllers/auth.controller.ts` | Route handlers for login and /me       |
| `client/src/app/core/interceptors/`         | Attaches token to outbound requests    |
| `client/src/app/core/guards/`               | Route guards protecting frontend pages |
