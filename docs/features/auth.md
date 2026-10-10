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
    - `jtr` — JWT revocation marker (see Password recovery)
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
3. Loads the user (company-scoped, two fields) and compares the token's `jtr` claim with the user's `jwtTokenRevokedAt`; a mismatch is `401`.
4. While the user has `mustChangePassword`, only `GET /api/auth/me` and `PUT /api/users/:id/change-password` pass; everything else is `403 PASSWORD_CHANGE_REQUIRED`.
5. Attaches the decoded payload to the request and calls `next()`, or responds with `401` if the token is missing, malformed, expired or revoked.

---

## Current User Context (`/me`)

`GET /api/auth/me` returns the full user object for the currently authenticated user. The Angular app calls this on startup (after finding a stored token) to rehydrate the session state without re-entering credentials.

---

## Password recovery and setup

Three entry points, one place where a user ends up choosing a password:

| Flow                          | Started by                             | User receives                                                             | Ends in                                          |
| ----------------------------- | -------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| Forgot password               | The user (`/forgot-password`)          | Email with a link `${APP_URL or first CLIENT_URL}/password-setup?token=…` | `/password-setup` (link mode)                    |
| Invitation (P0-24, not built) | Admin creates a user                   | Email with a link of purpose `invite`                                     | `/password-setup` (link mode)                    |
| Admin reset                   | Admin, `POST /api/auth/reset-password` | Email with a random 16-character temporary password (valid 24 h)          | `/password-setup` (forced mode) after signing in |

**Forgot password.** `POST /api/auth/forgot-password` validates nothing about the account in the request path: it answers
`200` with the same body at once and does the work afterwards, so unknown, inactive, malformed and failed-send cases cannot be
told apart by content or timing. Behind the scenes it looks the user up by email (globally unique), skips inactive users and
companies, sends at most 3 links per account per hour (counted from stored tokens, so it holds across instances), invalidates the
account's earlier links, stores a new token and emails the link.

**Tokens** live in the `OneTimeTokens` collection: `tokenHash` (SHA-256; the raw 256-bit value only exists in the email),
`user`, `company`, `purpose` (`forgot` now, `invite` reserved), `expiresAt` (30 min for `forgot`), `usedAt`. Documents are removed
by a TTL index 24 h after expiry. Run `npx ts-node src/scripts/syncIndexes.ts` (from `server/`) once so the unique and TTL indexes
exist (models use `autoIndex: false`).

**Redeeming.** `POST /api/auth/password-setup` checks the token (purpose, used, expired), then the password policy, then consumes the
token with one atomic `findOneAndUpdate` (`usedAt: null`), so of two concurrent requests exactly one wins. The password is hashed once
with bcrypt and written through the company-scoped user repository (the pre-save hook is not involved). If that write fails the
token is released so the user can retry. Success revokes all of the user's JWTs, clears `mustChangePassword`, voids the user's other links,
writes an audit entry (`password_reset`, password redacted) and sends a `password-changed` confirmation. A too-short password does
not burn the link.

**JWT revocation.** JWTs carry `jtr`, the user's `jwtTokenRevokedAt` (epoch ms, 0 if never) at sign-in. The middleware requires it to equal
the current value, so setting `jwtTokenRevokedAt = now` revokes every earlier token exactly (no one-second blind spot, unlike
comparing `iat`). Forgot-reset, admin reset and change-password all set it. Tokens issued before this feature have no `jtr` and stay
valid until the first revocation. The same write is the hook for a future admin "revoke all tokens" action.

**Admin reset.** The temporary password is generated server-side, shown to nobody, and only appears in the email. Signing in with
it works until `temporaryPasswordExpiresAt`; the client then forces `/password-setup`, where the temporary password is the current
password. After the change the user is signed out and signs in again.

**Policy and limits.** Token lifetimes, the per-account email limit and the minimum password length (6, same as create user and
change password) come from `getSecurityPolicy(companyId)` in `config/security-policy.ts`; every company gets the defaults today. Per-IP
limits (5/15 min forgot, 10/15 min setup) use in-memory counters, so they are per server instance. Set `TRUST_PROXY` behind a
reverse proxy so they see the client IP.

**Logging.** `password_reset.requested|completed|failed|by_admin` lines (`scope: "auth"`) carry ids, outcome and reason, never the
email address, token, link or password.

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
