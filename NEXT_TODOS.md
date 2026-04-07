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
    - [x] God user (OG_COMPANY_ID) correctly bypasses the scope filter and sees cross-company data.
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
- Status: [ ]
- Goal: reduce regression risk in high-use UI flows.
- Acceptance criteria:
    - [x] User create/edit form behavior tested.
    - [x] Profile edit and change-password flows tested.
    - [x] Route guard/auth state behavior tested.

### P0-07 Complete Employee Profile Data

- Priority: P0
- Owner: You
- Estimate: 1-1.5 days
- Status: [ ]
- Goal: ensure employee records are complete for HR operations and reporting.
- Acceptance criteria:
    - [ ] User profile and admin user form include:education[{university/institute, degree level, degree title, year of achieve}] work phone number, personal phone number, additionalPhoneNumbers, personal information, birthday/date of birth, gender, and salary, level(pointer to Levels), employmentDate.
    - [ ] Field-level validation is implemented (format/range/required rules where applicable).
    - [ ] Existing users can be migrated/updated safely without breaking old records.
    - [ ] Sensitive fields (especially salary) follow role-based visibility/edit permissions.

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
