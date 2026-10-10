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

## MVP Scope & Decisions (PM review, 2026-10-07)

Target: **MVP within ~6 months** (no fixed launch date). **First customer: a single pilot** (not self-serve SaaS, so no public signup or billing for now).

**In MVP:** employee directory + org chart + RBAC (done), email-based onboarding/auth, leaves, recruiting (port of an existing app), promotions, performance reviews, payroll (strong selling point, port + revamp of an existing implementation), company onboarding/seed, audit trail.

**End game:** the configurable request flow builder (P0-11). Every request-like module (leaves, promotions, later others) must be built so it plugs into one engine. See P0-11 architecture notes.

**Deferred / promised later:** SMS + OTP (P1-27), attendance (nothing designed yet).

**Guiding principle: audit-ready.** Modules built from now on must emit audit entries (actor, action, timestamp, before/after) even before the audit module (P0-13) ships. Do not wait for P0-13 to design for it.

**Dependencies:** P0-23 (email) -> P0-24 (invite/activate) and P0-25 (forgot password). Both are high priority but start after P0-23.

**Handled elsewhere / already settled:**

- Leaves (P0-08) design is being discussed with another agent.
- P0-07 profile completion items (validation, safe migration, salary visibility) were fixed.
- The legacy `department` field decision changed: users keep **department (primary + secondaries)** and **sub-department** fields at user level, instead of deriving department from title > sub-department.
- Minor known issues (date format, `**` markers, company-filtered dropdowns, failed-login toast, P0-07C/E) are intentionally ignored for now.

**Discussion queue:** P0-10 Requests page (next focus), P0-14 promotions, P0-12 payroll revamp.

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
    - [x] Repositories enforce company scoping for users, roles, departments, countries, sub-departments, employment titles (via `companyModel` factory).
    - [x] Tests prove users from company A cannot list or fetch users from company B (`company-isolation.test.ts`).
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
    - [x] Field-level validation is implemented (`server/src/utils/user-profile-validator.util.ts`, enforced on user create/update).
    - [x] Existing users can be migrated/updated safely without breaking old records (unchanged legacy values are not re-validated; `dataHealthChecks` reports legacy profile data).
    - [x] Sensitive fields (especially salary) follow role-based visibility/edit permissions.

### P0-07A Foundation Structural Base Audit + Fix Prompt Pipeline

- Priority: P0
- Owner: You
- Estimate: 1-1.5 days
- Status: [~]
- Goal: establish a hard quality gate for multi-tenant isolation, RBAC enforcement, schema integrity, and client route completeness before implementing new modules.
- Acceptance criteria:
    - [x] **Phase 0 — Audit tests/scripts added first (red before fix, green after fix).**
        - [x] Add `server/src/__tests__/rbac-coverage.test.ts` for write/delete guard coverage on HR entity routes and user-documents.
        - [x] Add `server/src/__tests__/schema-integrity.test.ts` to validate user schema integrity (including department scope behavior).
        - [x] Add `server/src/__tests__/repository-contract.test.ts` to enforce company-scoped repository behavior consistency.
        - [x] Add `client/scripts/check-routes.ts` to assert critical routes exist (`/non-authorized`, `/levels`, `/offices`).
    - [ ] **Phase 1 — Critical server fixes.**
        - [x] ~~Remove `department` field in user schema~~ **Decision changed:** keep `department` (primary + secondaries) and `sub-department` at user level. Verify department-scoped policy checks work with multiple departments.
        - [x] Add permission middleware on write/delete routes for departments, sub-departments, employment-titles, levels, and offices.
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

### P0-07B Ensuring scoping within Company

- When creating/editing user
  A) you need first to select department
  => filtering available sub departmnet => select sub department
  => filtering available employment titles => select available title

-when creating a user if country is greece then HR reprensetive needs to be from the same country

-Office should be in country

-selecting of non active roles, dep, general hr entite should not be possible
we should always fetch only the active ones for selection

-also when marking an hr entity is inactive , we should check dependendants entites and asking the user to first change the dependencies and then change it

### P0-07C Client should render options/buttons/menus based on permissions the user has

- Priority: Medium (deferred, not MVP-blocking for the pilot)
- Status: [ ]

### P0-07D Edit Roles should be a dedicated page for better UI, for searching and selecting permissions group them etc

### P0-07E HR employee has permission for self edit but (client?) guard blocks him

- Priority: Low (minor, ignored for now)
- Status: [ ]

### P0-08 Leaves Module (Single-Step Manager Approval)

- Note: built as the first request type on the P0-11 engine (09/10/2026, branch `feat/leaves-on-engine`), server side. What is built and what is still design: [docs/features/leaves.md](docs/features/leaves.md) section 0. The UI comes with P0-11D.
- Priority: P0
- Owner: You
- Estimate: 2-3 days
- Status: [~] (server done; UI pending)
- Goal: deliver a usable leave request workflow with one manager approval step.
- Acceptance criteria:
    - [x] Employees can create, view, and cancel leave requests (API; HR can also enter leave on someone's behalf).
    - [x] Managers can approve/reject leave requests in one step.
    - [x] Leave status lifecycle is tracked (pending, approved, rejected, canceled) on the shared Request.
    - [x] Basic leave balances are reflected/updated correctly (stored yearly grants, usage on approval, reversal on cancel; Unpaid has its own allowance; hire-year rule per company).
    - [ ] Leave UI (request dialog, balances), with the Requests page (P0-11D).
- Follow-ups (design in leaves.md): half days, holiday calendars, pay tiers, accrual and carry-over, notice / blackout / probation, coverage limits, change requests, sickness conversion, payroll export.

### P0-09 Recruiting Module (MVP)

- Note: **port the core logic and flow from the existing recruiting app** instead of designing from scratch. First step: inventory what is reusable (models, stages, flow) and map it onto this app's multi-tenant + RBAC model.
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

- Note: **next topic for discussion.** Design it on top of the unified request model from P0-11, not per module.
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

- Note: **the end game of the product.** The builder UI can come last, but the architecture must be right from the first request module. Proposed foundations (to validate in discussion):
    - One generic `Request` entity (type, requester, status, current step, payload, company) shared by all request types.
    - A request-type registry (leave, promotion, ...) that defines payload schema, side effects on approval, and default flow.
    - A flow definition (ordered steps, each with an approver resolver such as manager, HR rep, role, or specific user) stored per company and per type, versioned so in-flight requests keep their original flow.
    - A step engine that resolves the next approver and writes an audit entry on every transition.
    - Single-step manager approval (P0-08) is just the default flow of the leave type.
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

#### Approval Engine Tickets (P0-10 / P0-11 breakdown)

Source of truth: [docs/plans/approval-flows.md](docs/plans/approval-flows.md) (phase numbers below match its section 12). Leaves (P0-08) runs on this engine; see [docs/features/leaves.md](docs/features/leaves.md).

Open before phase 4: confirm the flow-scope precedence rule (most matching dimensions wins; ties: leaveType > department > country; identical scopes rejected at save).

##### P0-11A Plan Sign-off and Leaves Alignment (Phase 0)

- Priority: P0
- Status: [~]
- Acceptance criteria:
    - [x] Plan drafted and decisions recorded (resolve at step activation, effects, block on lost authority, final rejection, cancel on requester deactivation, never collapse steps, immediate approval recorded as decided).
    - [x] `leaves.md` reconciled with the plan.
    - [ ] Flow-scope precedence rule confirmed.

##### P0-11B Engine Core (Phase 1)

- Priority: P0
- Depends on: P0-11A
- Estimate: 4-5 days
- Status: [~]
- Goal: a tested engine that runs single-step flows on a multi-step-ready schema.
- Acceptance criteria:
    - [x] Models and repositories (company-scoped): `Requests` (live approvers in `pendingApprovers`, timeline in `actionsHistory`), `ApprovalFlows` (versioned), with a partial inbox index on pending requests. The separate `ApprovalTasks` collection was dropped (decided 08/10/2026). Indexes are created by `server/src/scripts/syncIndexes.ts` (renamed from `syncApprovalIndexes.ts` on 09/10/2026; models use `autoIndex: false`).
    - [x] Request type registry (payload schema, default flow, `canCreate`, `canApprove`, `onApproved`, `onRejected`, `onCanceled`, `summarize`, `detail`).
    - [x] Resolver service for the first resolver kinds (line manager, role, user) with fallback and "needs routing" handling.
    - [x] Engine operations: create, decide, cancel (type-level `canCancel`, default requester only; plan D5), cancel-after-approval (opt-in per type), system-initiated `engine.cancel` for effects.
    - [x] Immediate approval by an authorized creator: decisions recorded in the timeline, with reason and override flag.
    - [x] Self-approval blocked; authority rechecked at decision time (blocked if lost).
    - [x] Conditional updates for idempotency (double click, retry after crash); type effects idempotent by request id.
    - [x] Audit: requests keep their own append-only `actionsHistory`; `AuditLogs` is opt-in per entity via `server/src/config/audited-entities.ts` (field diff, redaction). Retention remains open in P1-29.
    - [x] Integration tests: approve, reject (final), cancel, double-decide, missing manager, inactive manager, self-approval, company isolation.

##### P0-11C Leave on the Engine + Inbox API (Phase 2)

- Priority: P0
- Depends on: P0-11B, P0-08
- Status: [x] (09/10/2026, branch `feat/leaves-on-engine`)
- Acceptance criteria:
    - [x] Leave registers as a request type with a default one-step line-manager flow and ledger effects.
    - [x] Inbox endpoint (pending requests for the current user via `pendingApprovers`, filter by type, paginated).
    - [x] One summary endpoint for login/home: `{ pendingForMe, myPending, unreadNotifications }` (`unreadNotifications` is 0 until P0-11G).
    - [x] Tests cover the leave approve/reject/cancel path end to end through the engine.
    - [x] Also built: `RequestTypes` collection per company (system / custom kinds), default flows stored in the DB (no code fallback), my requests / detail / decide / cancel endpoints, `requests:*` and `leaves:*` permissions. See [docs/plans/approval-flows.md](docs/plans/approval-flows.md) sections 8.4 and 16.
- After merging: run `server/src/scripts/syncIndexes.ts`, then `server/src/scripts/setupLeaves.ts` for existing companies.

##### P0-11D Requests Page (Phase 3, = P0-10)

- Priority: P0
- Depends on: P0-11C
- Status: [ ]
- Acceptance criteria:
    - [ ] Tabs: Needs my action, My requests, Team/Company (scope-dependent).
    - [ ] Filters by type, status, date range, requester, current step; consistent pagination and sorting.
    - [ ] Detail drawer: per-type renderer, step timeline (assigned, decided, reassigned, on behalf of), actions driven by what the user may do.
    - [ ] Pending badge in the header using the summary endpoint.
    - [ ] Follows the `ui-conventions` skill.

##### P0-11E Multi-Step Flows and Flow Builder (Phase 4)

- Priority: P0
- Depends on: P0-11D, precedence rule confirmed
- Status: [ ]
- Acceptance criteria:
    - [ ] Multiple steps, `any`/`all` modes, all resolver kinds (manager chain, department head, HR representative).
    - [ ] Flow versioning; in-flight requests keep their frozen flow.
    - [ ] Scoped flows (request type plus optional country, department, leave type) with the agreed precedence; duplicate scopes rejected.
    - [ ] Validation blocks empty flows, unresolvable steps, duplicate keys, and inactive roles or users.
    - [ ] Builder UI as an ordered list of steps.
    - [ ] Same approver in consecutive steps is asked separately (never collapsed).

##### P0-11F Effects and Delegation (Phase 5)

- Priority: P0
- Depends on: P0-11E
- Status: [ ]
- Acceptance criteria:
    - [ ] Manager change replaces pending approvers automatically (recorded in the request history); completed steps untouched.
    - [ ] Approver deactivated or loses authority: reassign through rule and fallback, or flag "needs routing".
    - [ ] Requester deactivated: pending requests canceled by the system, pending approvers cleared, `onCanceled` runs.
    - [ ] Approver on approved leave (`isUnavailable` hook): reassign to delegate or fallback, also when the leave starts.
    - [ ] `ApprovalDelegations` applied at step activation (delegate placed in `pendingApprovers`; `originalAssignee`, `onBehalfOf` recorded in the history).
    - [ ] Manual admin reassign with a mandatory reason.
    - [ ] Effects called from the service layer (never model hooks), covering single edit, bulk edit and import.
    - [ ] Reconciliation job for stale pending approvers and stuck requests.

##### P0-11G Notifications with Configurable Email (Phase 6a)

- Priority: P0
- Depends on: P0-23 (email), P0-11C
- Status: [ ]
- Acceptance criteria:
    - [ ] `Notifications` collection and in-app list/unread count.
    - [ ] `NotificationRules`: per request type, optional scope and step, event, recipients, email on/off.
    - [ ] Sensible defaults per type, overridable by rules; admin UI for rules.
    - [ ] Emails sent asynchronously; failures never affect the request; recipients stored at event time.

##### P0-11H Promotion on the Engine (Phase 6b, = P0-14)

- Priority: P0
- Depends on: P0-11E
- Status: [ ]
- Acceptance criteria:
    - [ ] Promotion registered as a request type with a configurable flow, no engine changes needed.
    - [ ] `onApproved` applies title, level and department changes and writes an employment-history entry.
    - [ ] Shown on the employee profile.

##### P0-11I Later (Phase 7)

- Priority: P2
- Status: [ ]
- Scope: conditional steps, escalation timers, parallel steps. Scoped separately.

### P0-12 Payroll Foundation (Essential HRMS Suggestion)

- Note: **a strong selling point, in the MVP.** An implementation already exists; plan is to port and revamp it. Inventory the existing one first, then fit it to the period/snapshot design below. Needs a design discussion.
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

- Note: **attendance is deferred** (no design yet, not a priority). The audit trail part stays in the MVP, and other modules should be built audit-ready before this ships. Attendance criteria below are kept for later.
- Priority: P0 (audit trail) / Deferred (attendance)
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

- Note: **in the MVP.** A simple implementation already exists; to be discussed. Should be a request type on the P0-11 engine (approval applies title/department/level changes) and write to the employment history log.
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

- Note: **in the MVP.** Two existing implementations to compare; pick the better flow and port it. Needs a short comparison before building.
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

### P1-22 Error Handling Hardening (follow-ups)

- Priority: P1
- Owner: You
- Estimate: 3-4 days
- Status: [~]
- Goal: finish the error-handling standards that were not implemented in the first pass.
- Already done: fixed-text hard errors with a stable `code`, typed `AppError` classes, `asyncHandler`/`wrapController` on all routes, central error middleware, 404 route handler, 429 handled by the error format, multer errors mapped, client 401/403/429/5xx/network interceptor, GET-only retry with backoff, request timeouts, token only sent to our API, global `ErrorHandler`.
- Acceptance criteria:
    - [ ] **Request ID / correlation ID.**
        - Middleware generates a UUID per request (or reuses a trusted `X-Request-Id`), stores it on `req`, and sets the `X-Request-Id` response header.
        - Error responses include `requestId`; every log line for the request includes it (morgan token + logger).
        - Client shows the id on 5xx toasts ("Reference: abc123") so support can trace it.
    - [ ] **Structured logging.**
        - Replace `console.log`/`console.error` and `morgan("dev")` with pino (or winston): JSON in production, pretty in dev, levels (debug/info/warn/error).
        - Redact `password`, `newPassword`, `authorization`, `token`, `salary`, and cookies in logged bodies/headers.
        - Use `pino-http` for access logs so they carry the request id.
        - Stop logging `req.body` in controller catch blocks (currently logs raw bodies).
    - [ ] **Input validation (zod or Joi).**
        - Add a `validate({ body, query, params })` middleware; schemas live next to each controller.
        - Return 400 with `code: "VALIDATION_ERROR"` and per-field `errors: [{ path, code }]` (no free-text server messages, consistent with the hard-error rule).
        - Replace the ad hoc `typeof` checks and `setMappedFields` validation on all write endpoints (users, roles, departments, sub-departments, employment titles, countries, levels, offices, user-documents, auth).
        - Add tests for invalid payloads per endpoint.
    - [ ] **Mongoose / database errors.**
        - Map in the error middleware: duplicate key (`code 11000`) to 409 `CONFLICT`, `CastError` (bad ObjectId) and `ValidationError` to 400, `MongoServerSelectionError` to 503.
        - Add a `SERVICE_UNAVAILABLE` code (503) for DB/Supabase outages.
        - Tests: duplicate email, malformed `:id`.
    - [ ] **Process-level handlers + graceful shutdown.**
        - In `server.ts`: handle `unhandledRejection` and `uncaughtException` (log, then exit non-zero so the orchestrator restarts).
        - Handle `SIGTERM`/`SIGINT`: stop accepting connections, `server.close()`, close mongoose, with a force-exit timeout (about 10s).
    - [ ] **Auth throttling and enumeration protection.**
        - `express-rate-limit` on `/api/auth/login` only (for example 5-10 attempts per 15 min per IP + email), stricter than the global limiter.
        - Wrong password and unknown email must return identical status, body and timing: run a dummy `bcrypt.compare` against a fixed hash when the user is not found.
        - Optional: temporary account lockout after N failures, and an audit log entry for failures.
        - Set `app.set("trust proxy", ...)` correctly when deployed behind nginx so the limiter sees the real client IP.
    - [ ] **Other hardening.**
        - `helmet` is already enabled: review CSP/HSTS/referrer-policy settings for production.
        - Body size limits: `express.json({ limit: "100kb" })` and `express.urlencoded`; keep multer limits (5 MB images, 10 MB documents).
        - Restrict CORS to the exact `CLIENT_URL` per environment (no wildcards).
    - [ ] **Monitoring.**
        - Sentry (or similar) on server: capture 5xx and unhandled errors with request id and user id/company id (no PII, no bodies).
        - Sentry on client via the `ErrorHandler` for uncaught errors, with release/source maps.
        - Alert on error-rate spikes (see P2-20).
    - [ ] **Refresh tokens (replace the logout-on-401 behavior).**
        - Short-lived access token (about 15 min) plus a rotating refresh token in an httpOnly, secure, SameSite cookie, stored hashed server-side so it can be revoked.
        - Endpoints: `POST /auth/refresh`, `POST /auth/logout` (revokes the refresh token).
        - Client interceptor: on 401, call refresh once (single-flight, queue parallel requests), retry the original request, and log out only if refresh fails.
        - Consider moving the token out of `localStorage` (XSS exposure).
    - [ ] **Migrate controllers to typed errors.**
        - Remove the per-method `try/catch` + `hardError(res)` in controllers; throw `NotFoundError`, `ForbiddenError`, `ConflictError`, and so on and let the error middleware respond.
        - Keep the `console.log` of the original error out of controllers (the middleware logs it with the request id).
        - Do this after the soft-error standardization below, so it is done once.
    - [ ] **Standardize soft vs hard errors (decision needed).**
        - Today not-found and validation use `200 + success:false` (soft errors) because the edit-user resolver redirects only on `!success`.
        - Target: 404 for not found, 400/422 for validation, 409 for conflicts, and the client handles the statuses (resolvers use `catchError` + redirect).
        - Update the Jest expectations that currently assume 200 (login failures) or 403 (bad token on `/me`; the middleware returns 401).
        - After this, `softError` can be removed or limited to true business-rule outcomes.
    - [ ] **Client follow-ups.**
        - Redirect to login with a `returnUrl` after a 401 and return the user there after login.
        - Remove the per-component `toast.error(err.error?.message || "...")` duplicates; one global handler (the interceptor already provides a friendly `message`).
        - Add an opt-out (`HttpContext` flag) for requests that must stay silent (background polling, resolvers).
        - Branch on `error.error.code` instead of status or message text where behavior differs.
        - Add unit tests for `errorInterceptor`, `retryInterceptor`, and `GlobalErrorHandler`.
    - [ ] **Known issues found while doing this.**
        - `UserController.getUsers` is currently hard-disabled with `return unauthorizedError(res)` ("TEMPORARY"), which breaks `GET /api/users` and 3 RBAC/company-isolation tests; restore it once access control is ready.
        - `user.controller.ts` has unused imports (`IUsersQueryParams`, `softErrorRes`, `notFoundError`, `badRequestError`, `conflictError`, `buildUserSearchAccessQuery`) that fail lint.
        - Failing user-document tests (`rbac-coverage`, `repository-contract`): the routes have no permission middleware and the repository is not company-scoped (see P0-07A Phase 2 and 4).

## MVP Additions (PM review, 2026-10-07)

### P0-23 Email Integration (High)

- Priority: P0 (high)
- Status: [~] (code done; provider account + domain setup pending)
- Goal: a tenant-aware transactional email service that other features build on.
- Acceptance criteria:
    - [x] Choose a provider (e.g. Resend, SES, Postmark, SMTP) and add the env vars to `server/src/config/env.ts` + `.env.example` (fail fast when missing in production).
    - [x] Email service abstraction (`send(template, to, data)`) with a console/log transport for local dev and tests.
    - [x] Template system (HTML + text) with company branding hooks.
    - [x] Failures are logged (no sensitive data) and do not break the calling request; retry strategy defined.
    - [x] Basic tests with a mocked transport.
    - [x] First real use: password-reset security notice to the user when an admin resets their password (fire-and-forget, tested).
    - [ ] Provider account: Resend account, sending domain verified (SPF/DKIM/DMARC), API key and `EMAIL_*` set in production, DPA signed.
- Unblocks: P0-24, P0-25, leave and request notifications.

### P0-24 Invite + Account Activation (High, depends on P0-23)

- Priority: P0 (high)
- Status: [ ]
- Goal: new employees get an invitation email and set their own password.
- Acceptance criteria:
    - [ ] Creating a user sends an invitation email with a single-use, expiring token (stored hashed).
    - [ ] `POST /api/auth/activate-account` sets the password and activates the account (enable the commented-out route in `auth.routes.ts`).
    - [ ] Expired/used token errors are clear; admins can resend the invitation.
    - [ ] Password rules match the existing change-password policy; the endpoint is rate limited.
    - [ ] Client activation page.
    - [ ] Tests for token expiry, reuse, and tenant scoping.

### P0-25 Forgot / Reset Password (High, depends on P0-23)

- Priority: P0 (high)
- Status: [~] (code done; production steps below pending)
- Goal: users can recover access without an admin.
- Acceptance criteria:
    - [x] `POST /api/auth/forgot-password` always returns the same response (no account enumeration) and sends a reset link.
    - [x] Single-use, short-lived, hashed reset token; sessions issued before the reset are invalidated (`sra` claim vs `sessionsRevokedAt`).
    - [x] Client "forgot password" and "password setup" pages linked from login.
    - [x] Strict rate limiting on both endpoints (per IP, plus 3 links per account per hour).
    - [x] Tests for expiry, reuse, unknown email, tampering, wrong purpose, concurrency, tenant scoping and logs.
    - [x] Admin reset now emails a random temporary password (24 h) that must be changed at first sign-in.
    - [ ] Production: run `npx ts-node src/scripts/syncIndexes.ts` once (OneTimeTokens unique + TTL indexes); set `TRUST_PROXY` (and optionally `APP_URL`).
- Reuse for P0-24: issue an `invite` row in `OneTimeTokens` (`oneTimeTokenRepository`, `generateRawToken`, `hashToken`), add `"invite"` to `SETUP_PURPOSES` in `password-setup.service.ts` (and activate the user there), email the link to `/password-setup?token=`.

### P1-25a Per-company security settings (Low, follow-up of P0-25)

- Priority: P1 (low)
- Status: [ ]
- Goal: each company sets its own values; today every company gets the defaults in `config/security-policy.ts`.
- Acceptance criteria:
    - [ ] A settings collection (slug/name, company, data) read by `getSecurityPolicy(companyId)`.
    - [ ] Configurable: token lifetimes, temporary password lifetime, links per account per hour, per-IP limits where company is known.
    - [ ] Configurable password policy (length, character classes), enforced by every place that sets a password, with matching client validation.

### P1-25b Sessions and force logout (Low, follow-up of P0-25)

- Priority: P1 (low)
- Status: [ ]
- Goal: admin "sign out everywhere" and, if wanted, a device/session list.
- Notes: `sessionsRevokedAt = now` already revokes every token; this adds the admin action and UI. A `Sessions` collection is only needed for per-device revoke.
- Acceptance criteria:
    - [ ] Admin action that sets `sessionsRevokedAt` for a user (audited).
    - [ ] Decide whether per-device sessions are needed.

### P1-25c Auth hardening leftovers (Low)

- Priority: P1 (low)
- Status: [ ]
- Acceptance criteria:
    - [ ] Shared rate-limit store (for example Redis) if the API runs on more than one instance.
    - [ ] Equalise login timing for unknown emails (a bcrypt compare is skipped today).
    - [ ] Emails are matched exactly as typed (case-sensitive), like login; decide on normalising to lowercase.

### P0-26 Company Onboarding + Seed + Data Import (Medium)

- Priority: P1 (medium)
- Status: [ ]
- Goal: get the pilot company from zero to a working tenant without hand-entering data. Related to the existing seed command and the CSV/Excel import item in the Known Issues list below.
- Note: single pilot customer, so a scripted/admin-driven flow is enough; no self-serve signup or billing.
- Acceptance criteria:
    - [ ] Define the company creation flow (admin script or super-admin UI) including first admin user via the invite flow (P0-24).
    - [ ] Seed command covers the starting structure (see the seed item below) and is safe to re-run.
    - [ ] CSV/Excel import for departments, sub-departments, titles, levels, offices, countries, and users, with a dry-run validation report.
    - [ ] Imports respect company scoping and the same validation as the forms.

### P1-27 SMS + OTP Integration (Low, promised for later)

- Priority: P1 (low)
- Status: [ ]
- Goal: SMS notifications and OTP-based auth. Marketed as upcoming, not in the MVP.
- Acceptance criteria:
    - [ ] Provider chosen; SMS service abstraction mirroring the email service (P0-23).
    - [ ] OTP generation/verification with expiry and attempt limits.
    - [ ] Optional second factor at login, configurable per company.

### P1-28 Dashboard Insights (Low)

- Priority: P1 (low)
- Status: [ ]
- Goal: useful HR numbers on the dashboard. Not required for core functionality.
- Acceptance criteria:
    - [ ] Headcount by department/country, new joiners, upcoming document expiries.
    - [ ] Who is out today and pending approvals (after leaves and requests exist).
    - [ ] All widgets respect the viewer's permission scope.

### P1-29 Audit Trail Design (Medium, design now, build with P0-13)

- Priority: P1 (medium)
- Status: [ ]
- Goal: agree on the audit entry shape now so new modules can emit entries from day one.
- Acceptance criteria:
    - [ ] Define the `AuditLog` model and a small `audit.record(...)` helper (actor, company, entity, action, timestamp, before/after summary, request id).
    - [ ] Salary and other sensitive values are redacted or masked in audit payloads.
    - [ ] New modules (leaves, promotions, payroll, reviews) call the helper from their first version.
    - [ ] Retention policy noted (see Come Back To).

### Production Readiness Notes (Low priority)

Collected from the review; none block the pilot MVP but all are needed before real customers.

- [ ] Request IDs and structured logging, see P1-16 and P1-22.
- [ ] Auth-endpoint rate limiting and input validation on every write endpoint, see P1-17.
- [ ] Review CORS and helmet settings for production.
- [ ] Consistent loading/empty/error states across management tables, see P1-18.
- [ ] Deployment runbook, rollback procedure, smoke test checklist, see P1-19.
- [ ] Uptime and health monitoring with alert thresholds, see P2-20.
- [ ] Frontend test coverage for the approval flows (leaves/requests) as they are built.

### Deferred / Intentionally Ignored For Now

- Attendance module (no design yet), see P0-13.
- Minor UX bugs listed under Known Issues (date format, double `**` markers, company-filtered dropdowns, failed-login toast).
- P0-07C (permission-aware menus/buttons) and P0-07E (HR self-edit guard).

### Come Back To

Topics to revisit before the pilot goes live. Not scheduled yet.

- **Salary encryption key management.** There is no rotation plan, and losing `SALARY_ENCRYPTION_KEY` means losing all salary data. Decide on: key backup, key versioning (store a key id with each ciphertext), rotation/re-encryption script, and where the key lives in production (secrets manager).
- **GDPR / data protection.** The pilot likely holds EU (Greek) employee data. Decide on: data processing agreement basics, employee data export, erasure/anonymisation vs. legal retention, retention periods (documents, audit logs, payroll), access logging of sensitive fields, and data location for MongoDB Atlas and Supabase.

## Optional Stretch

### P3-22 Upgrade Server to Express 5 (minor)

- Priority: P3
- Estimate: 0.5 day
- Status: [ ]
- Goal: use native async error handling and drop the `asyncHandler`/`wrapController` workaround.
- Acceptance criteria:
    - [ ] Upgrade `express` to v5 and `@types/express` to v5 in `server/package.json`.
    - [ ] `tsc`, lint and Jest pass (record the failing tests beforehand to separate pre-existing failures).
    - [ ] Check `req.body` usage where no body is sent (it is `undefined` instead of `{}` in v5).
    - [ ] Re-check the `as RequestHandler` casts in the route files against the v5 types.
    - [ ] Remove `server/src/utils/async-handler.util.ts` and the `wrapController(...)` lines in the 11 route files.
    - [ ] Confirm `cors`, `helmet`, `morgan`, `multer`, and `express-rate-limit` work on v5 (verify upload endpoints).
    - [ ] Route patterns: only literal and `:param` paths are used today; keep it that way (v5 changed wildcard syntax).

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
-(low) Configurable date format: let a company (default) or user (override) choose DD/MM/YYYY, MM/DD/YYYY or YYYY-MM-DD. The client is already centralized: `core/utils/date-format.ts` (`DATE_FORMATS`), `shared/pipes/app-date.pipe.ts` and `core/utils/app-date-adapter.ts` (Material datepicker). Remaining work: a `dateFormat` field on company/user (server + interface), a settings screen, and have those three files read the value from a service instead of the hardcoded `dd/MM/yyyy`. Keep server exports (CSV/PDF) on the same formatter.
-(low priority) Create a sign in workflow that accept the initial data loading via csv/excel files for all the required entities
-Departments, users, levels, offices, countries, etc all entities necesasary for a functiona app
-Alternatively add a feature that adds the necessary starting mock data, 1 country eg greece, basic departments (eng , hr, marketing, finance, sales), 1 empl title for each dep , 1 sub department, etc
-(high) failed sign in needs to trigger a toast warning with server response

### P3 - Titles have salary ranges per country
