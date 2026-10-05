# Changelog

Significant changes to the application, most recent first.

---

## Current

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
