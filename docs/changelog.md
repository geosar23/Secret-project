# Changelog

Significant changes to the application, most recent first.

---

## Current

### Forgot password, password setup and admin temporary passwords (P0-25) (10/10/2026)

- **Forgot password:** "Forgot password?" on the login page opens `/forgot-password`. The user gets an email with a 30-minute, single-use link to `/password-setup`. The request always gets the same answer, so it cannot be used to find out which emails have accounts.
- **Password setup page** (`/password-setup`) serves the emailed link and the first sign-in with a temporary password, with clear messages for expired, used and invalid links. The token is removed from the address bar immediately.
- **Admin reset changed:** the admin no longer types a password. `POST /api/auth/reset-password` takes only `userId`; the user is emailed a random temporary password that works for 24 hours and must be replaced at first sign-in.
- **JWTs are revoked on password change:** forgot-reset, admin reset and change-password revoke every older JWT. After changing their own password a user has to sign in again. Tokens carry a new `tra` claim; the auth middleware now reads the user on each request.
- New endpoints `POST /api/auth/forgot-password` and `POST /api/auth/password-setup` (rate limited per IP; max 3 links per account per hour). New `OneTimeTokens` collection (hashed tokens, TTL) and a `password-changed` confirmation email; `password-reset-notice` is replaced by `temporary-password`.
- New user fields `tokensRevokedAt`, `mustChangePassword`, `temporaryPasswordExpiresAt`. Token lifetimes and limits sit behind `getSecurityPolicy(companyId)` (defaults for every company for now).
- **Manual steps:** run `npx ts-node src/scripts/syncIndexes.ts` once; set `TRUST_PROXY` and optionally `APP_URL` in production. See `docs/features/auth.md`.

### Requests page: cards, Team tab and filters (10/10/2026)

- **Requests page** now matches the design: three summary cards (My pending requests, Needs my action with the oldest date, Needs routing) that open the list they count, a **Team** tab, and request type, status (including "Needs routing") and submitted-between filters on every tab. The subtitle is "Review and manage requests".
- "Needs my action" now also shows for people who oversee a team, not only when something is waiting. The Team tab and the Needs routing card show only when you may read other people's requests.
- New `GET /api/requests/team`; `/inbox` and `/mine` accept `from`, `to` and `status=needsRouting`; `/summary` adds `oldestPendingForMe`, `needsRouting` and `hasTeam`.

### Leave and Requests UI, first slice (10/10/2026)

- **Dashboard:** the Leave Tracker now shows real balances per leave type (available days, a used and pending bar, untracked types show days used). Clicking a type opens the Request leave modal with it selected. New "My Requests" and, for approvers, "Waiting for you" panels link to the Requests page; the "Leave Days Left" tile is real and "My Leave" is active.
- **Request leave modal:** leave type, date range (DD/MM/YYYY), optional reason, and a live preview of the days counted and the balance after ("Annual leave balance 12 → 7 days available"). Rule errors from the server (overlap, not enough balance, no working days) show inline.
- **Requests page** (`/requests?tab=inbox|mine&id=...`): "Needs my action" (shown when something is waiting) and "My requests" tabs, a "New request" menu listing the request types you can start (`GET /api/request-types` filtered by what you are allowed to create; leave today), a status filter, a paginated list and a detail panel with the leave details, the history timeline, and Approve, Reject (comment) and Cancel (reason required) driven by `can`. On narrow screens the list and the detail show one at a time.
- **Header:** "Requests" is added to the user menu. The notifications bell is unchanged; it is meant to aggregate pending tasks and other notifications later.
- `GET /api/requests/:id` now returns `people`, a map of user id to name for everyone in the timeline, so the UI can label each step.
- Not built yet: the Team tab, a date filter, HR on-behalf / approve-now / override fields, a "needs routing" overview, and the leave settings screens.

### Leaves on the approval engine (P0-08, P0-11C)

- Leave is the first request type on the approval engine: employees (or HR / a manager on their behalf) request leave, the line manager approves or rejects (HR representative as fallback), the requester or HR cancels. Server only; the UI comes with the Requests page.
- New engine HTTP layer for every request type: `/api/requests/inbox`, `/mine`, `/summary`, `/:id`, `/:id/decision`, `/:id/cancel`, and `/api/request-types`.
- Request types are configured per company (`RequestTypes` collection), and default approval flows are stored in the database. A request is refused when its type is not enabled or no flow is configured.
- Leave domain: leave types, versioned policies (company-wide or per country), work schedules (any working weekdays), per-day leave lines, and an append-only ledger. Each leave type has its own allowance; yearly grants are stored, pro-rated, given in full, or skipped in the hire year depending on a company setting.
- New permissions: `requests:read`, `leaves:read|write|approve`, `leaveBalances:read|write`, `leaveSettingsManagement:read|write`, added to the default roles.
- Business-rule errors (overlap, insufficient balance, backdated...) are returned as soft errors with a readable message and `error.rule`.
- Scripts: `syncApprovalIndexes.ts` is renamed `syncIndexes.ts` and covers the new collections; `setupLeaves.ts` updates existing companies; `grantLeaveEntitlements.ts` posts the yearly grants (cron on 01/01 or on demand).

### Transactional email service (P0-23)

- Added `EmailService.send(template, to, data, { company, requestId })` with console and Resend (official SDK) providers, HTML + text templates (test-email, invitation, password-reset, password-reset-notice) and company branding. See `docs/features/email.md`.
- **Password reset notice:** when an administrator resets a user's password, that user now gets a security email (no password, no link). It is sent in the background and never changes the API response.
- Env var `EMAIL_TRANSPORT` is now `EMAIL_PROVIDER`. New script `npm run email:test -- you@example.com` (in `server/`) sends a test email with the configured provider.
- Production now fails fast at boot if email config is missing or invalid.

### Users management: selection and bulk edit

- Redesigned the Users page: row selection (kept across pages, with "select all N matching"), a floating bulk-action bar, avatar + status badges, and a clear-filters button.
- Added **bulk edit** (employment title, office, country, manager, HR representative, level, role) with a review step, plus bulk status change and downloading only the selected users. Both can be undone right after applying.
- There is no bulk API endpoint: changes are sent as one `PUT /api/users/:id` per user, so each user is still authorised and validated individually and failures are reported per user.
- Added the project skill `.claude/skills/ui-conventions` (Angular Material first, then existing classes/components, custom SCSS last).

### Org chart, new dashboard and admin sidebar

- Added an **Org Chart** page (`/org-chart`) for all employees, with a line-manager view and a departments view, pan/zoom, search and collapsible branches. It is backed by `GET /api/users/org-chart`, which is open to any authenticated user and returns only non-sensitive fields.
- Redesigned the dashboard (greeting hero, profile strip, profile completion bar, personal workspace). The leave, attendance, announcements and upcoming sections are labelled placeholders until those modules exist.
- Admin pages moved from the header menu into a permission-filtered sidebar. The header's user menu was restyled.

### Demo company seed

- Added `npm run seed:demo` (in `server/`) to create a company with default roles, a starter org structure and a super admin. See [Getting Started](./getting-started.md#seed-a-demo-company).

### Docker support

- Added `server/Dockerfile` and `client/Dockerfile` (multi-stage builds).
- Added `docker-compose.yml` at the repo root for local full-stack orchestration.
- Added `client/nginx.conf` for SPA routing inside the nginx container.
- Added `server/.env.example` documenting all required and optional environment variables.
- `CLIENT_URL` now accepts a comma-separated list of CORS origins — a single `.env` works for both local dev (`http://localhost:4200`) and Docker (`http://localhost`) without changes.
- Fixed `server/package.json` `start` script pointing at `dist/server.ts` instead of `dist/server.js`.

---

### Multi-tenancy hardened

- Removed OG company / GOD user concepts. All users and entities are now strictly tenant-isolated with no exceptions.
- Repositories enforce `companyId` scoping on every query. Verified by integration tests.

### Company management removed from UI

- Companies are provisioned outside the app. The UI no longer has a companies management section.
- Company logo and name is available read-only via `GET /api/companies/:id` (Supabase Storage, signed URL).

### Extended employee profile fields

- User model extended with identity, contact, employment, education, and compensation sections.
- Salary stored AES-256-GCM encrypted; excluded from list endpoints; decrypted only on single-user fetch.
- New reference collections added: `Levels` and `Offices` (company-scoped, full CRUD).

### User documents

- New `UserDocuments` collection: passport, national ID, visa, work permit, and other identity documents.
- Supports file attachment (PDF or image, ≤ 10 MB) via Supabase Storage.
- Full CRUD at `/api/user-documents` with signed-URL and delete-attachment endpoints.

### HR entity management modules added

- Dedicated management UI and API for countries, departments, sub-departments, and employment titles.

### User administration expanded

- Manager assignment, richer create/edit forms, stronger validation.
- User-level permission grant/revoke endpoints and UI integrations.

### Profile self-service

- Profile route context resolution added.
- Profile editing and change-password workflows integrated.

### File storage

- Supabase Storage integration for profile images (metadata stored in MongoDB).
- Profile image upload, signed-URL delivery, and delete endpoints.
- Company logo storage and signed-URL delivery.

### Permission-aware company field visibility

- "Company" column/field hidden across all management pages (users, roles, departments, countries, employment titles, sub-departments) when the user lacks cross-company view permission.
- Driven by a single shared permission check — no duplicated logic per module.

### CI pipeline

- GitHub Actions workflow added (`.github/workflows/ci.yml`).
- Client: install, lint, headless test, build.
- Server: install, lint, build.

### Server environment validation

- Required environment variables validated at startup (`MONGO_URI`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`).
- Invalid values produce actionable errors. Server exits with `process.exit(1)` on bad config.
- Hardcoded JWT fallback removed.

### Integration test suite

- Auth tests: 7+ scenarios for login, `/me`, token validation.
- RBAC tests: permission grant/revoke, 401/403 enforcement.
- Company isolation tests: cross-company data access prevention verified.
- Permission factory unit tests.

### Frontend improvements

- Improved responsiveness and layout in tables and filter sections.
- Breadcrumb navigation: auto-composed from route hierarchy, home icon, Material chevron separators, dynamic label overrides.
