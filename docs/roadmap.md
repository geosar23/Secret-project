# Roadmap

This file tracks planned features and upcoming work. Items are grouped by priority.

Status legend: `[ ]` Not started · `[~]` In progress · `[x]` Done

---

## P0 — Core Product (In Progress)

### Employee Profile — UI & Validation

- `[~]` Admin user form and employee profile page reorganised into labelled sections: Identity, Contact, Employment, Education
- `[x]` Field-level validation (format / range / required rules)
- `[x]` Sensitive fields (especially salary) behind role-based visibility/edit permissions

### Leaves Module (Single-Step Manager Approval)

- `[~]` Employees can create, view, and cancel leave requests (API built 09/10/2026; dashboard, Request leave modal and Requests page built 10/10/2026)
- `[x]` Managers can approve/reject in one step (shared approval engine)
- `[x]` Leave status lifecycle: pending → approved / rejected / canceled
- `[x]` Basic leave balance tracking (per leave type, stored yearly grants)

### Recruiting Module (MVP)

- `[ ]` Create and manage job openings
- `[ ]` Create and manage candidates, assign to openings
- `[ ]` Candidate stage tracking: applied → screening → interview → offer → hired / rejected
- `[ ]` Role-based access enforced for recruiting data

### Requests Page (Unified Employee Requests)

- `[ ]` Dedicated page listing all requests with filters by type / status / date
- `[ ]` Users see their own requests; managers/admins see scoped requests
- `[ ]` Consistent pagination and sorting

### Configurable Request Flow Builder

- `[ ]` Admin defines approval flow per request type (step order + approver role)
- `[ ]` Engine resolves next approver based on configured flow
- `[ ]` Requests page reflects current step, pending approver, and final status

### Payroll Foundation

- `[ ]` Payroll period model and salary snapshot strategy
- `[ ]` Fixed salary component management and basic adjustments
- `[ ]` Downloadable payslip data structure

### Attendance + Audit Trail

- `[ ]` Basic attendance records per employee/day
- `[ ]` Attendance data usable by leaves and payroll modules
- `[ ]` Audit logs for critical changes: user, role, salary, leave approvals

### Promotion Module

- `[ ]` Create promotion requests with effective date and reason
- `[ ]` Approval updates employee role/title/department
- `[ ]` Promotion history stored and visible on employee profile

### Performance Review Module

- `[ ]` Define review cycles (period, participants, due dates)
- `[ ]` Managers submit ratings and written feedback per employee
- `[ ]` Employees view finalised reviews and acknowledgement status

### Email Integration for (notifications, forgot password flow)

### SMS Integration for (notifications, OTPs, auth)

---

## P0 — Known Issues / UX Fixes

- `[ ]` Create/edit user form: required fields should show a single `*` marker, not double `**`
- `[ ]` When creating a user as a cross-tenant admin and selecting a company, all related dropdowns (manager, department, employment title, etc.) must be filtered to that selected company
- `[ ]` Date display format should be DD/MM/YYYY consistently across all UI (selectors, tables, forms)
- `[ ]` Failed sign-in should trigger a toast notification with the server error message

### Seeding / Onboarding

- `[ ]` CSV/Excel import flow for initial data loading (departments, users, levels, offices, countries, etc.)
- `[x]` A "seed demo data" command that creates a starting structure (1 country, basic departments, sample titles, sub-departments, etc.). See [Getting Started](./getting-started.md#seed-a-demo-company)

---

## P1 — Stability & Observability

### Structured Logging + Request Correlation

- `[ ]` Each request logs method, route, status, and latency
- `[ ]` Request ID included and propagated
- `[ ]` Error logs do not leak sensitive data

### Employment History Log Collection

- `[ ]` Log entries for: join, left, title change, salary change, promotion, department transfer
- `[ ]` Fields: action, date, reason, approver

### Security Hardening Pass

- `[ ]` Confirm helmet / CORS / rate-limit settings are production-ready
- `[ ]` Stronger auth endpoint throttling
- `[ ]` Consistent input validation on all write endpoints

### Admin UX Consistency Pass

- `[ ]` Consistent loading / empty / error states across management tables
- `[ ]` Filters reset predictably
- `[ ]` Pagination behaviour aligned across modules

### Deployment Runbook

- `[ ]` Runbook: env setup, build/start commands, health checks
- `[ ]` Rollback procedure documented and tested
- `[ ]` Smoke test checklist

### Domain & Hosting Topology (decided 10/10/2026)

Domain: `worktaxis.com` (registered at Squarespace). Nothing is deployed yet; this records the plan.

**Pilot — Option 1: single address, path-based**

- `[ ]` Serve everything from `app.worktaxis.com` (root `worktaxis.com` stays free for a marketing page or redirect)
- `[ ]` `/` serves the Angular app, `/api/*` is proxied to the Express backend (nginx `location /api/` → `backend:3000`), or Express serves the built client statically
- `[ ]` Client calls relative `/api/...` URLs (no hard-coded `localhost:3000` in environment files)
- `[ ]` `CLIENT_URL`/CORS and cookie settings match the single origin
- `[ ]` Transactional email sent from a subdomain (`notify.worktaxis.com`) with SPF, DKIM and DMARC configured
- Why: one domain, one certificate, no CORS or cross-site cookie issues, least work for a single pilot customer

**Proper SaaS — Option 2: separate subdomains (revisit when moving beyond the pilot)**

- `[ ]` Re-evaluate topology at that point (subdomains vs. staying path-based vs. other options) rather than assuming this is final
- `[ ]` Candidate layout: `app.worktaxis.com` (frontend), `api.worktaxis.com` (backend), `*.worktaxis.com` (per-tenant subdomains such as `acme.worktaxis.com`)
- `[ ]` Needs: CORS allow-list per origin, cookie `SameSite`/`Domain` review, wildcard DNS + wildcard TLS cert, reserved subdomains (`app`, `api`, `docs`, `status`, `mail`, `notify`) blocked from tenant claims
- `[ ]` DNS: Squarespace may not support wildcard records. Plan to point nameservers to Cloudflare (free) while keeping Squarespace as registrar
- Why: independent frontend/backend deploys and scaling, per-tenant URLs and branding

---

## P2 — Nice to Have

- `[ ]` Uptime/health monitoring with basic alert thresholds
- `[ ]` Final release candidate stabilisation and bug bash
