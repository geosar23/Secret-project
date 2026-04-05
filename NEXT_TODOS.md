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

## Week 1 (Foundation + Risk Reduction)

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
- Status: [ ]
- Goal: prevent cross-company data leaks.
- Acceptance criteria:
    - [ ] Repositories/services enforce company scoping for users, roles, departments, countries, sub-departments, employment titles.
    - [ ] Tests prove records from company A are invisible to company B.
    - [ ] Any leak identified is fixed.

### P0-05 Profile Image Flow Reliability

- Priority: P0
- Owner: You
- Estimate: 0.5-1 day
- Status: [ ]
- Goal: make upload/sign/delete robust.
- Acceptance criteria:
    - [ ] Upload success case tested.
    - [ ] Signed URL retrieval tested.
    - [ ] Delete flow tested.
    - [ ] Invalid type/size and missing image cases handled.

## Week 2 (Quality + Release Readiness)

### P1-06 Frontend Critical Flow Tests

- Priority: P1
- Owner: You
- Estimate: 1-1.5 days
- Status: [ ]
- Goal: reduce regression risk in high-use UI flows.
- Acceptance criteria:
    - [ ] User create/edit form behavior tested.
    - [ ] Profile edit and change-password flows tested.
    - [ ] Route guard/auth state behavior tested.

### P1-07 Structured Logging + Request Correlation

- Priority: P1
- Owner: You
- Estimate: 0.5-1 day
- Status: [ ]
- Goal: improve debugging and production observability.
- Acceptance criteria:
    - [ ] Each request logs method, route, status, latency.
    - [ ] Request ID included and propagated.
    - [ ] Error logs avoid leaking sensitive data.

### P1-08 Security Hardening Pass

- Priority: P1
- Owner: You
- Estimate: 1 day
- Status: [ ]
- Goal: tighten API protections.
- Acceptance criteria:
    - [ ] Confirm helmet/cors/rate-limit settings.
    - [ ] Stronger auth endpoint throttling verified.
    - [ ] Validation is consistent on all write endpoints.

### P1-09 Admin UX Consistency Pass

- Priority: P1
- Owner: You
- Estimate: 1 day
- Status: [ ]
- Goal: improve operational usability for admin users.
- Acceptance criteria:
    - [ ] Consistent loading/empty/error states across management tables.
    - [ ] Filters reset predictably.
    - [ ] Pagination behavior aligned across modules.

### P1-10 Deployment + Rollback Runbook

- Priority: P1
- Owner: You
- Estimate: 0.5 day
- Status: [ ]
- Goal: make deploys repeatable and safe.
- Acceptance criteria:
    - [ ] Runbook includes env setup, build/start commands, health checks.
    - [ ] Rollback procedure documented and tested once.
    - [ ] Smoke test checklist included.

## Optional Stretch (If Time Allows)

### P2-11 Monitoring Baseline

- Priority: P2
- Estimate: 0.5 day
- Status: [ ]
- Acceptance criteria:
    - [ ] Uptime/health monitoring enabled.
    - [ ] Basic alert thresholds defined.

### P2-12 Release Candidate Stabilization

- Priority: P2
- Estimate: 0.5-1 day
- Status: [ ]
- Acceptance criteria:
    - [ ] Final bug bash completed.
    - [ ] High-severity defects resolved or deferred with rationale.
    - [ ] Release candidate tag created.

## Definition of Done (Sprint)

- [ ] All P0 tickets complete.
- [ ] At least 80% of P1 tickets complete.
- [ ] CI passing on default branch.
- [ ] No open high-severity auth or data isolation issues.
- [ ] Deployment runbook validated end-to-end once.

## Daily Checklist (Execution Discipline)

- [ ] Re-prioritize today’s top 1-2 items.
- [ ] Update ticket statuses in this file.
- [ ] Run lint + tests for touched areas.
- [ ] Write/update tests for each bug fixed.
- [ ] Log blockers immediately.
