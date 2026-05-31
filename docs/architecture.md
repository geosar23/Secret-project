# Architecture

## Overview

The application is a multi-tenant HR SaaS built as a monorepo with two independent apps:

```
client/   → Angular 21 single-page application (Material Design)
server/   → Node.js + Express REST API (TypeScript + MongoDB)
```

External services:

- **MongoDB** — primary data store
- **Supabase Storage** — object storage for profile images, company logos, and user documents
- **JWT** — stateless authentication tokens

---

## System Diagram

```
Browser (Angular SPA)
       │
       │  HTTPS / JSON
       ▼
Express REST API  (:3000)
       │
       ├── MongoDB (Users, Roles, Departments, …)
       └── Supabase Storage (files / images)
```

The Angular app communicates exclusively with the Express API. There is no direct client-to-database or client-to-Supabase connection.

---

## Backend Structure (`server/src/`)

```
server/src/
├── server.ts          Entry point — creates the HTTP server
├── app.ts             Express app — registers middleware and mounts routes
├── routes.ts          Top-level route aggregator
├── config/            Environment validation and database connection
├── controllers/       Route handlers (thin — delegate to services)
├── services/          Business logic
├── repositories/      Data-access layer (all MongoDB queries live here)
├── models/            Mongoose schemas
├── middleware/        Auth, permission checks, error handling, file upload
├── interfaces/        TypeScript interfaces for all domain objects
├── enums/             Shared enums (permissions, profile fields, user roles)
├── policies/          Query-level access policies (e.g. search scoping)
├── types/             Module augmentations (e.g. extended Express Request)
├── utils/             Shared pure helpers
└── __tests__/         Integration test suites
```

### Layer responsibilities

| Layer      | Responsibility                                            |
| ---------- | --------------------------------------------------------- |
| Controller | Parse request, call service, return HTTP response         |
| Service    | Orchestrate business logic, call repositories             |
| Repository | All MongoDB queries; enforces company scope               |
| Middleware | Cross-cutting concerns: auth, permissions, upload, errors |

---

## Frontend Structure (`client/src/app/`)

```
client/src/app/
├── app.config.ts      Angular application config (providers, router)
├── app.routes.ts      Top-level route definitions
├── core/
│   ├── guards/        Route guards (auth, permissions)
│   ├── interceptors/  HTTP interceptors (attach JWT, handle 401)
│   ├── services/      Shared singletons (auth, current user, etc.)
│   ├── interfaces/    TypeScript interfaces shared across features
│   ├── enums/         Frontend enums (mirrors server enums)
│   └── utils/         Shared pure helpers
├── features/          One folder per feature module (lazy-loaded)
│   ├── auth/
│   ├── dashboard/
│   ├── users/
│   ├── roles/
│   ├── permissions/
│   ├── profile/
│   ├── departments/
│   ├── sub-departments/
│   ├── countries/
│   ├── employment-titles/
│   └── notFound/
└── shared/            Reusable components, pipes, directives
```

---

## Multi-Tenancy

Every entity in the system is scoped to a **company**. This is enforced at the repository layer:

- Every MongoDB query for tenant-scoped data includes a `companyId` filter derived from the authenticated user's token.
- A user from Company A **cannot** read, write, or delete data belonging to Company B — this is enforced in code and verified by integration tests (`company-isolation.test.ts`).
- Companies themselves are provisioned out-of-band (outside the app). There is no self-signup flow.

---

## Authentication Flow

1. Client POSTs credentials to `POST /api/auth/login`.
2. Server validates, issues a signed JWT containing `userId` and `companyId`.
3. Client stores the token and attaches it as a `Bearer` token on every subsequent request via an HTTP interceptor.
4. Server's `auth.middleware.ts` verifies the token on every protected route and attaches the decoded user to `req.user`.

See [Authentication deep-dive](./features/auth.md).

---

## Authorization (RBAC)

Access control is two-layered:

1. **Role-based** — users are assigned a role which carries a set of permissions.
2. **User-level overrides** — individual permissions can be granted or revoked per user, on top of their role.

The effective permission set = (role permissions) + (user grants) - (user revocations).

See [Permissions & Roles deep-dive](./features/permissions-roles.md).

---

## File Storage

Files (profile images, company logos, user document attachments) are stored in **Supabase Storage**. MongoDB stores only the file path/metadata. Signed URLs are generated server-side on demand.

See [File Storage deep-dive](./features/file-storage.md).

---

## Key Design Principles

- **Fail fast** — server validates environment variables at startup and refuses to boot with invalid config.
- **Principle of least privilege** — all routes require authentication by default; permission checks are additive.
- **Separation of concerns** — controllers are thin, business logic lives in services, data access is isolated to repositories.
- **No client-side secrets** — Supabase service role key and JWT secret never reach the browser.
