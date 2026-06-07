# HRMS Next TODOs (2-Week Execution Plan)

Purpose: move this project from feature-complete development into stable, production-ready beta quality.

## How to Use This File

- Treat each ticket as a deliverable.
- Complete all P0 items before moving to P1.
- Keep this file updated as work progresses.

Status legend:

- [ ] Not started
- [~] In progress
- [x] Done

## (Foundation + Risk Reduction)

### P0-01 CI Pipeline for Client + Server

- Priority: P0
- Owner: You
- Estimate: 0.5-1 day
- Status: [x]
- Goal: every PR validates install, lint, test, and build for both apps.
- Acceptance criteria:
    - [x] CI runs on push/PR (`.github/workflows/ci.yml`).
    - [x] Client checks: install, lint, test (headless Chrome), build.
    - [x] Server checks: install, lint, build.
    - [ ] Failing checks block merge (set in GitHub repo → Settings → Branch protection rules → "Require status checks").

### P0-02 Server Environment Validation (Fail Fast)

- Priority: P0
- Owner: You
- Estimate: 0.5 day
- Status: [x]
- Goal: startup fails with clear messages if env is invalid.
- Acceptance criteria:
    - [x] Required vars validated at boot (`MONGO_URI`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`).
    - [x] Invalid values produce actionable errors (`SUPABASE_URL` HTTPS check, `PORT` numeric check).
    - [x] App does not start with bad config (`process.exit(1)`).
    - [x] `auth.service.ts` hardcoded JWT fallback removed.

### P0-03 Backend Integration Tests: Auth + RBAC

- Priority: P0
- Owner: You
- Estimate: 1-1.5 days
- Status: [x]
- Goal: protect critical access control paths.
- Acceptance criteria:
    - [x] Login and `/me` tested (valid creds, wrong password, unknown email, missing fields, valid token, no token, bad token).
    - [x] Protected routes reject unauthorized/forbidden access (401 no token, 403 invalid token).
    - [x] Permission grant/revoke endpoints tested (401 no auth, 403 insufficient perms, 200 with ALL permission).
    - [x] Happy path and failure path coverage — 21 tests, all passing.
    - [x] Test infra: Jest + ts-jest + Supertest + mongodb-memory-server (`server/src/__tests__/`).

### P0-04 Company Scope Isolation Verification

- Priority: P0
- Owner: You
- Estimate: 1 day
- Status: [x]
- Goal: prevent cross-company data leaks.
- Acceptance criteria:
    - [x] Repositories enforce company scoping for users, roles, departments, countries, sub-departments, employment titles (via `companyModel` factory and `OG_COMPANY_ID` bypass).
    - [x] Tests prove users from company A cannot list or fetch users from company B (`company-isolation.test.ts`).
    - [x] God user (OG_COMPANY_ID) correctly bypasses the scope filter and sees cross-company data. (obsolete)
    - [x] Roles are verified to be company-scoped in the test suite.

### P0-05 Permission-Aware Company Field Visibility (All Management Pages)

- Priority: P0
- Owner: You
- Estimate: 1 day
- Status: [x]
- Goal: hide the company column/field for users who lack cross-company view permission, across all management modules.
- Acceptance criteria:
    - [x] User management table: "Company" column hidden when user lacks cross-company view permission.
    - [x] User create/edit form: "Company" field hidden when user lacks cross-company view permission.
    - [x] Roles management table + create/edit form: same company field visibility logic applied.
    - [x] Departments management table + create/edit form: same company field visibility logic applied.
    - [x] Countries management table + create/edit form: same company field visibility logic applied.
    - [x] Employment titles management table + create/edit form: same company field visibility logic applied.
    - [x] Sub-departments management table + create/edit form: same company field visibility logic applied.
    - [x] Visibility check is driven by a single shared permission/policy — no duplicated guard logic per module.

### P0-06 Frontend Critical Flow Tests

- Priority: P0
- Owner: You
- Estimate: 1-1.5 days
- Status: [x]
- Goal: reduce regression risk in high-use UI flows.
- Acceptance criteria:
    - [x] User create/edit form behavior tested.
    - [x] Profile edit and change-password flows tested.
    - [x] Route guard/auth state behavior tested.

### P0-07 Complete Employee Profile Data

- Priority: P0
- Owner: You
- Estimate: 1-1.5 days
- Status: [~]
- Goal: ensure employee records are complete for HR operations and reporting.
- Acceptance criteria:
    - [x] **Phase 1 — Core profile fields.** User model extended with:
        - **Identity**: `legalName`, `firstName`, `lastName`, `personalEmail`, `gender` (enum), `birthday` (Date), `maritalStatus` (enum), `nationalities` (string[]), `religion`
        - **Contact**: `workPhone`, `personalPhone`, `additionalPhones` (string[]), `currentAddress`, `homeCountryAddress`, `homeCountryPhone`, `emergencyContact` (name, relationship, phone)
        - **Employment**: `employmentDate` (Date), `employmentType` (enum: full_time | part_time | contractor | intern), `payrollId`, `office` (→ Offices), `isOutsourced` (boolean), `hrRepresentative` (→ Users), `level` (→ Levels)
        - **Education**: `education[{ institution, degreeLevel (enum), degreeTitle, yearAchieved }]`
        - **Compensation**: `salary` (AES-256-GCM encrypted string; excluded from list endpoints, decrypted on single-user fetch)
        - New reference collections: `Levels` and `Offices` (company-scoped, full CRUD at `/api/levels` and `/api/offices`)
    - [x] **Phase 2 — Documents.** `UserDocuments` collection (passport / national ID / visa / work permit etc): `type` (enum), `documentNumber`, `expiryDate`, `issuingCountry`, `notes`, `attachment` (Supabase Storage, PDF or image ≤10 MB). Full CRUD at `/api/user-documents`. Signed-URL and delete-attachment endpoints included.
    - [x] **UI grouping.** Admin user form and employee profile page reorganized into labelled sections: Identity, Contact, Employment, Education.
    - [ ] Field-level validation is implemented (format/range/required rules where applicable).
    - [ ] Existing users can be migrated/updated safely without breaking old records.
    - [ ] Sensitive fields (especially salary) follow role-based visibility/edit permissions.

### P0-07A Foundation Structural Base Audit + Fix Prompt Pipeline

- Priority: P0
- Owner: You
- Estimate: 1-1.5 days
- Status: [ ]
- Goal: establish a hard quality gate for multi-tenant isolation, RBAC enforcement, schema integrity, and client route completeness before implementing new modules.
- Acceptance criteria:
    - [ ] **Phase 0 — Audit tests/scripts added first (red before fix, green after fix).**
        - [ ] Add `server/src/__tests__/rbac-coverage.test.ts` for write/delete guard coverage on HR entity routes and user-documents.
        - [ ] Add `server/src/__tests__/schema-integrity.test.ts` to validate user schema integrity (including department scope behavior).
        - [ ] Add `server/src/__tests__/repository-contract.test.ts` to enforce company-scoped repository behavior consistency.
        - [ ] Add `client/scripts/check-routes.ts` to assert critical routes exist (`/non-authorized`, `/levels`, `/offices`).
    - [ ] **Phase 1 — Critical server fixes.**
        - [ ] Add missing `department` field in user schema and verify department-scoped policy checks work.
        - [ ] Add permission middleware on write/delete routes for departments, sub-departments, employment-titles, levels, and offices.
    - [ ] **Phase 2 — Security coverage fixes.**
        - [ ] Add RBAC middleware for user CRUD routes.
        - [ ] Add RBAC middleware for role read endpoints.
        - [ ] Add RBAC middleware for user-document endpoints.
    - [ ] **Phase 3 — Client completeness fixes.**
        - [ ] Add `/non-authorized` route + access-denied page.
        - [ ] Implement missing levels feature page + route.
        - [ ] Implement missing offices feature page + route.
        - [ ] Add permission guards to management routes beyond auth-only protection.
    - [ ] **Phase 4 — Architecture consistency fixes.**
        - [ ] Refactor user-document repository to align with company-scoped repository contract.
        - [ ] Implement `permissions.routes.ts` endpoint(s) for permission key discovery.
        - [ ] Standardize API error semantics (prefer proper 4xx/5xx over `200 + success:false`).
    - [ ] **Verification gate (mandatory before P0-08).**
        - [ ] `cd server && npm test` passes including all new audit tests.
        - [ ] `cd client && npm run build` passes.
        - [ ] Manual check: plain employee cannot mutate HR entities (403).
        - [ ] Manual check: `/non-authorized`, `/levels`, `/offices` routes resolve correctly.

### NOTES FOR P0-07A

Plan: HRMS Multi-Tenant Foundation Audit
TL;DR: The codebase has real functionality but has several critical gaps in RBAC coverage, a broken schema field, missing client routes, and architecture inconsistencies. The plan audits these systematically: write failing tests first (red), then produce a fix prompt per issue that a separate agent can execute independently.

Discovered Issues
CRITICAL — Breaks core functionality

# Issue Impact

1 User schema missing department field — IUser declares it but Mongoose schema doesn't. ALL department-scoped RBAC (DEPARTMENT, DEPARTMENT_COUNTRY) silently returns false for every user. user.policy.ts and search-access.policy.ts are functionally broken for these scopes. Scope-restricted permissions are dead code (FIXED BY REMOVING DEP FROM USER INTERFACE SINCE ITS DERIVES FROM EMPLOYMENT TITLE)

2 Unguarded HR entity write routes — POST/PUT/DELETE on /departments, /sub-departments, /employment-titles, /levels, /offices have only authMiddleware. Any employee can mutate company structure. Any authenticated user = admin for org data
HIGH — Security holes

# Issue

3 No RBAC on GET /users, GET /users/:id, PUT /users/:id, POST /users/ — listing has a policy inside the controller but fetch/update don't enforce scope at all
4 No RBAC on GET /roles, GET /roles/:id, GET /roles/hierarchy — any authenticated user reads all role data
5 No RBAC on /user-documents/\* — any authenticated user can read/write/delete any document in the company
6 createUserGuard / editUserGuard redirect to /non-authorized — but that route doesn't exist, landing users on a 404 page
HIGH — Client feature gaps

# Issue

7 features/levels/ Angular folder is missing — backend + level.service.ts exist, no UI or route
8 features/offices/ Angular folder is missing — backend + office.service.ts exist, no UI or route
9 Permission route guards only exist for users/create and users/:id/edit — /roles, /departments, /countries, /sub-departments, /employment-titles are unguarded (login only)
MEDIUM — Architecture integrity

# Issue

10 userDocumentRepository() returns a raw Mongoose model — breaks the repository contract (all others return a pre-scoped object). Future callers can forget to add { company }.
11 permissions.routes.ts is empty and does nothing — the permissions management API is absent
12 Soft-error inconsistency — many endpoints return HTTP 200 + { success: false } instead of proper 4xx, breaking monitoring and client error handling
13 No consistent input validation — ad-hoc typeof checks, no Zod/Joi schema on write endpoints
Phase 0 — Foundation Audit Tests (Verify Issues Exist)
Write failing tests that serve as acceptance criteria. After fixes, they go green.

Steps:

0a. New file server/src/**tests**/rbac-coverage.test.ts

For each HR entity route (/departments, /sub-departments, /employment-titles, /levels, /offices): assert that an authenticated plain employee receives 403 on POST, PUT, DELETE
Assert same for /user-documents write endpoints
Assert GET /roles requires at minimum authentication
0b. New file server/src/**tests**/schema-integrity.test.ts

Create a user with a department ObjectId, read it back, assert user.department is populated (currently fails because the field doesn't exist in schema)
Create a user with a department-scoped permission, run buildUserSearchAccessQuery, assert the generated filter includes a department clause (currently returns empty filter)
0c. New file server/src/**tests**/repository-contract.test.ts

Assert that calling userDocumentRepository() without arguments returns an object with company-scoped find/create/update/delete methods (not a raw model)
0d. Client check script client/scripts/check-routes.ts

Read app.routes.ts and assert routes exist for: /non-authorized, /levels, /offices
Phase 1 — Critical Fix Prompts
Fix Prompt 1 — User schema department field

Add a department field ({ type: Schema.Types.ObjectId, ref: 'Department', required: false }) to the Mongoose UserModel schema in user.model.ts. Verify that user.policy.ts and search-access.policy.ts department-scope checks now correctly use user.department. Add it to the update allowed fields in the user controller/service. Ensure existing records with no department continue to work (field is optional).

Fix Prompt 2 — HR entity route RBAC

In department.routes.ts, sub-department.routes.ts, employment-title.routes.ts, level.routes.ts, office.routes.ts: add userHasAnyPermission([PermissionKeys.{ENTITY}_MANAGEMENT_WRITE_ALL]) middleware to every POST, PUT, and DELETE route handler. Follow the exact pattern used in country.routes.ts as the reference.

Phase 2 — Security Fix Prompts
Fix Prompt 3 — User CRUD RBAC

Add permission middleware to user routes in user.routes.ts: GET /users and POST /users require USERS_MANAGEMENT read/write. GET /users/:id and PUT /users/:id must verify the actor has scope to access the subject (use canActorAccessSubject from permission.middleware.ts).

Fix Prompt 4 — Role read RBAC

In role.routes.ts: add userHasAnyPermission([PermissionKeys.ROLES_MANAGEMENT_READ_ALL]) to GET /roles, GET /roles/:id, GET /roles/hierarchy.

Fix Prompt 5 — User documents RBAC

In user-document.routes.ts: add appropriate USERS_MANAGEMENT permission checks to all endpoints. Read endpoints require a read permission; write/delete endpoints require a write permission.

Fix Prompt 6 — /non-authorized route

In app.routes.ts: add a /non-authorized route. Create a minimal NotAuthorizedComponent in client/src/app/features/not-authorized/. The component should display a clear "You don't have permission to access this page" message with a link back to /dashboard.

Phase 3 — Client Completeness Fix Prompts
Fix Prompt 7 — Levels UI (parallel with Fix 8)

Create client/src/app/features/levels/ with a list table component and a create/edit dialog, following the exact pattern of features/countries/ as reference. Add route /levels to app.routes.ts inside the auth guard. Register LevelService (already exists in core/services/).

Fix Prompt 8 — Offices UI (parallel with Fix 7)

Same as Fix 7 but for features/offices/, following features/countries/ as reference. OfficeService already exists.

Fix Prompt 9 — Permission route guards on management pages

Add permission guards to /roles, /departments, /countries, /sub-departments, /employment-titles in app.routes.ts. Create new guard functions in core/guards/ following the pattern of createUserGuard and editUserGuard, using PermissionService checks for the relevant management permissions.

Phase 4 — Architecture Fix Prompts
Fix Prompt 10 — userDocumentRepository contract

Refactor user-document.repository.ts to accept companyId: string and return a companyModel(UserDocumentModel, companyId) — identical to all other repositories. Update all callers in user-document.service.ts to pass companyId.

Fix Prompt 11 — Implement permissions.routes.ts

Implement GET /api/permissions in permissions.routes.ts — returns all PermissionKeys grouped by category. Require authMiddleware. Register it in server/src/routes/routes.ts.

Verification
After all fixes:

cd server && npm test — all tests (including Phase 0 suite) must pass
cd client && ng build — build must succeed with no errors
Manual: login as plain employee → attempt POST /api/departments → must get 403
Manual: navigate to /non-authorized, /levels, /offices → correct pages render
Manual: login as employee → navigate to /roles → redirected to /non-authorized
Decisions & Scope Boundaries
Included: RBAC gaps, schema correctness, missing client routes, repository contract
Excluded: structured logging, payroll/leave/recruiting features, performance improvements
Each fix prompt is self-contained — can be handed to a separate agent with no shared context
Phase 0 tests are written intentionally red (failing) to prove issues exist; they become green after fixes
Fix prompts in Phase 3 (Levels UI / Offices UI) are independent and can run in parallel

### P0-08 Leaves Module (Single-Step Manager Approval)

- Priority: P0
- Owner: You
- Estimate: 2-3 days
- Status: [ ]
- Goal: deliver a usable leave request workflow with one manager approval step.
- Acceptance criteria:
    - [ ] Employees can create, view, and cancel leave requests.
    - [ ] Managers can approve/reject leave requests in one step.
    - [ ] Leave status lifecycle is tracked (pending, approved, rejected, canceled).
    - [ ] Basic leave balances are reflected/updated correctly.

### P0-09 Recruiting Module (MVP)

- Priority: P0
- Owner: You
- Estimate: 3-4 days
- Status: [ ]
- Goal: introduce a minimal recruiting pipeline for job openings and candidates.
- Acceptance criteria:
    - [ ] Create/manage job openings.
    - [ ] Create/manage candidates and assign them to openings.
    - [ ] Candidate stage tracking implemented (applied, screening, interview, offer, hired/rejected).
    - [ ] Role-based access enforced for recruiting data.

### P0-10 Requests Page (Unified Employee Requests)

- Priority: P0
- Owner: You
- Estimate: 1.5-2 days
- Status: [ ]
- Goal: provide one place for users and approvers to see all request items.
- Acceptance criteria:
    - [ ] Dedicated requests page with list and filters by type/status/date.
    - [ ] Users can see their own requests and current statuses.
    - [ ] Managers/admins can see requests relevant to their scope/permissions.
    - [ ] Pagination/sorting behavior is consistent with other management pages.

### P0-11 Configurable Request Flow Builder

- Priority: P0
- Owner: You
- Estimate: 2-3 days
- Status: [ ]
- Goal: allow admins to configure approval flows per request type without code changes.
- Acceptance criteria:
    - [ ] Admin can define approval flow per request type (minimum: step order + approver role).
    - [ ] Engine resolves next approver based on configured flow.
    - [ ] Requests page reflects current step, pending approver, and final status.
    - [ ] Invalid/incomplete flow configurations are blocked with clear validation.

### P0-12 Payroll Foundation (Essential HRMS Suggestion)

- Priority: P0
- Owner: You
- Estimate: 2-3 days
- Status: [ ]
- Goal: prepare core payroll data flow needed for monthly salary operations.
- Acceptance criteria:
    - [ ] Define payroll period model and salary snapshot strategy.
    - [ ] Support fixed salary component management and basic adjustments.
    - [ ] Generate downloadable payslip data structure (even if PDF is deferred).
    - [ ] Audit entries captured for salary/payroll changes.

### P0-13 Attendance + Audit Trail Baseline (Essential HRMS Suggestion)

- Priority: P0
- Owner: You
- Estimate: 2 days
- Status: [ ]
- Goal: establish attendance tracking and auditable change history for compliance.
- Acceptance criteria:
    - [ ] Basic attendance records (present/absent/leave) available per employee/day.
    - [ ] Attendance data can be used by leaves and payroll modules.
    - [ ] Critical entity changes (user, role, salary, leave approvals) write audit logs.
    - [ ] Audit entries include actor, action, timestamp, and before/after summary.

### P0-14 Promotion Module

- Priority: P0
- Owner: You
- Estimate: 1.5-2 days
- Status: [ ]
- Goal: manage employee promotion history with proper approval and org structure updates.
- Acceptance criteria:
    - [ ] Create promotion requests with effective date and reason.
    - [ ] Promotion approval updates employee role/title/department as configured.
    - [ ] Promotion history is stored and visible on employee profile.
    - [ ] Permission checks ensure only authorized managers/HR can create or approve promotions.

### P0-15 Performance Review Module

- Priority: P0
- Owner: You
- Estimate: 2-3 days
- Status: [ ]
- Goal: provide a structured cycle for setting goals and recording performance reviews.
- Acceptance criteria:
    - [ ] Define review cycles (period, participants, due dates).
    - [ ] Managers can submit ratings and written feedback per employee.
    - [ ] Employees can view finalized reviews and acknowledgment status.
    - [ ] Access control and audit trail applied to all review actions.

### P1-16 Structured Logging + Request Correlation

--EmploymentHistoryLogsCollection[{action: join | left | title change | salary change | promotion | dep transfer etc}, date, reason, approver, ]

### P1-17...

- Priority: P1
- Owner: You
- Estimate: 0.5-1 day
- Status: [ ]
- Goal: improve debugging and production observability.
- Acceptance criteria:
    - [ ] Each request logs method, route, status, latency.
    - [ ] Request ID included and propagated.
    - [ ] Error logs avoid leaking sensitive data.

### P1-17 Security Hardening Pass

- Priority: P1
- Owner: You
- Estimate: 1 day
- Status: [ ]
- Goal: tighten API protections.
- Acceptance criteria:
    - [ ] Confirm helmet/cors/rate-limit settings.
    - [ ] Stronger auth endpoint throttling verified.
    - [ ] Validation is consistent on all write endpoints.

### P1-18 Admin UX Consistency Pass

- Priority: P1
- Owner: You
- Estimate: 1 day
- Status: [ ]
- Goal: improve operational usability for admin users.
- Acceptance criteria:
    - [ ] Consistent loading/empty/error states across management tables.
    - [ ] Filters reset predictably.
    - [ ] Pagination behavior aligned across modules.

### P1-19 Deployment + Rollback Runbook

- Priority: P1
- Owner: You
- Estimate: 0.5 day
- Status: [ ]
- Goal: make deploys repeatable and safe.
- Acceptance criteria:
    - [ ] Runbook includes env setup, build/start commands, health checks.
    - [ ] Rollback procedure documented and tested once.
    - [ ] Smoke test checklist included.

## Optional Stretch

### P2-20 Monitoring Baseline

- Priority: P2
- Estimate: 0.5 day
- Status: [ ]
- Acceptance criteria:
    - [ ] Uptime/health monitoring enabled.
    - [ ] Basic alert thresholds defined.

### P2-21 Release Candidate Stabilization

- Priority: P2
- Estimate: 0.5-1 day
- Status: [ ]
- Acceptance criteria:
    - [ ] Final bug bash completed.
    - [ ] High-severity defects resolved or deferred with rationale.
    - [ ] Release candidate tag created.

-(high)Create and edit user dialog , when something is required dont add double \*_ only one _
-(high)Create and edit user dialog , when creating a user as god and you can select the company/tenat then manager, dep, employment titles and etc fields should be available only from the selected company , a user from company A cannot have a manager from company B and so on for all other company specific entities
-(low) Client generic ui, date format an all visible fields , selectors etc should day month year, and not month day year or antyhing else.
-(low priority) Create a sign in workflow that accept the initial data loading via csv/excel files for all the required entities
-Departments, users, levels, offices, countries, etc all entities necesasary for a functiona app
-Alternatively add a feature that adds the necessary starting mock data, 1 country eg greece, basic departments (eng , hr, marketing, finance, sales), 1 empl title for each dep , 1 sub department, etc
-(high) failed sign in needs to trigger a toast warning with server response
