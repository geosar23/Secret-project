# Permissions & Roles

## Overview

Access control is two-layered:

1. **Roles** — a named set of permissions assigned to a user (e.g. `Admin`, `HR Manager`, `Employee`).
2. **User-level overrides** — individual permissions can be granted to or revoked from a specific user, on top of whatever their role provides.

**Effective permissions = (role permissions) ∪ (user grants) ∖ (user revocations)**

This means an admin can fine-tune access per individual without creating a new role for every edge case.

---

## Roles

### What a role is

A role is a MongoDB document containing:

- `name` — display name
- `companyId` — tenant scope (roles are company-specific)
- `permissions` — array of permission keys the role grants

### Role management

Roles are managed through the Roles module in the UI and via `PUT /api/roles/:id`. When a user's role changes, their effective permissions update immediately on the next request.

### System roles

Some roles are protected (system roles) and cannot be deleted through the normal UI to prevent accidental lockout. Check `server/src/models/role.model.ts` for the `isSystem` flag.

---

## Permissions

### Permission keys

All permission keys are defined in a single enum shared between client and server:

- `server/src/enums/permissions.enum.ts`
- `client/src/app/core/enums/` (mirrored)

This ensures both sides always agree on what keys exist. When adding a new permission, update both files.

### Permission structure

Permissions follow a `category:scope:action` convention, for example:
category usually means feature.
Also dot notations for sub categorizing something is accepted
users.a:country:read

```
users:all:read
users:all:write
roles:all:read
departments:all:write
```

This structure allows the UI to group related permissions and enables future wildcard matching.

### Granting / revoking per user

```
POST /api/users/:id/permissions/grant   { permission: "users:all:write" }
POST /api/users/:id/permissions/revoke  { permission: "users:all:write" }
```

Both endpoints require the caller to have the `ALL` permission.

---

## Checking Permissions on the Server

The `permission.middleware.ts` factory accepts one or more required permission keys and returns an Express middleware that:

1. Reads the effective permissions from `req.user` (computed after auth middleware runs).
2. Checks that the user holds **all** required permissions.
3. Calls `next()` or responds `403 Forbidden`.

Example usage in a route file:

```ts
router.delete("/:id", requirePermission("countries:all:write"), controller.delete);
```

---

## Checking Permissions on the Client

The Angular app exposes a `PermissionChecker` / `PermissionService` in `client/src/app/core/` that reads the effective permission set from the current user state. Components and route guards use this service to show/hide UI elements and protect navigation.

The company field visibility across all management pages (users, roles, departments, etc.) is a concrete example: a single shared permission check determines whether the "Company" column/field is shown, without duplicating logic per module.

---

## Permissions UI Page

The dedicated Permissions page (`client/src/app/features/permissions/`) provides an admin interface for viewing and managing permission assignments per user.

---

## Related Files

| File                                             | Purpose                                          |
| ------------------------------------------------ | ------------------------------------------------ |
| `server/src/enums/permissions.enum.ts`           | Source of truth for all permission keys (server) |
| `server/src/middleware/permission.middleware.ts` | Permission guard middleware factory              |
| `server/src/models/role.model.ts`                | Role Mongoose schema                             |
| `server/src/services/role.service.ts`            | Role business logic                              |
| `server/src/repositories/`                       | Role repository (company-scoped queries)         |
| `client/src/app/features/roles/`                 | Roles management UI                              |
| `client/src/app/features/permissions/`           | Permissions management UI                        |
| `client/src/app/core/services/`                  | PermissionService (client-side checks)           |
| `client/src/app/core/guards/`                    | Route guards using permission checks             |
