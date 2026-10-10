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

Permissions follow a `{category}:{action}:{scope}` format, for example:

```
usersManagement:read:*
usersManagement:write:department
userProfile.identity:read:self
userProfile.compensation:write:managed
userCreate:write:country
rolesManagement:write:*
```

Categories may use dot notation for sub-categories (e.g. `userProfile.identity`). The server's wildcard checker automatically falls back to the parent category, so `userProfile:write:*` satisfies a check for `userProfile.identity:write:*`.

### Permission categories

| Category                   | Actions available          | Purpose                                                                                                                                              |
| -------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `usersManagement`          | `read`, `write`            | List/view users (`read`); open Edit User page (`write`)                                                                                              |
| `userCreate`               | `write`                    | Create new users; scopes which country/dept/manager the actor may assign                                                                             |
| `userProfile`              | `read`, `write`            | Parent category for all profile sections                                                                                                             |
| `userProfile.identity`     | `read`, `write`            | Identity fields on the Edit User profile                                                                                                             |
| `userProfile.contact`      | `read`, `write`            | Contact fields                                                                                                                                       |
| `userProfile.employment`   | `read`, `write`            | Employment fields                                                                                                                                    |
| `userProfile.education`    | `read`, `write`            | Education fields                                                                                                                                     |
| `userProfile.compensation` | `read`, `write`            | Compensation fields                                                                                                                                  |
| `countriesManagement`      | `read`, `write`            | Countries CRUD                                                                                                                                       |
| `rolesManagement`          | `read`, `write`            | Roles CRUD                                                                                                                                           |
| `resetPassword`            | `write`                    | Reset another user's password                                                                                                                        |
| `requests`                 | `read`                     | View other people's requests (no `self` scope: own requests need no permission)                                                                      |
| `leaves`                   | `read`, `write`, `approve` | See leave (`read`), submit leave for self or on someone's behalf (`write`), approval authority checked at decision time (`approve`, no `self` scope) |
| `leaveBalances`            | `read`, `write`            | View balances (`read`); manual adjustments and the yearly grant run (`write:*`)                                                                      |
| `leaveSettingsManagement`  | `read`, `write`            | Leave types, policies, work schedules and company leave settings (`*` only)                                                                          |

### Scopes

| Scope                | Meaning                                      |
| -------------------- | -------------------------------------------- |
| `*`                  | All records within the actor's company       |
| `department`         | Records in the actor's department            |
| `country`            | Records in the actor's country               |
| `department-country` | Records matching both department and country |
| `managed`            | Records where actor is the direct manager    |
| `self`               | The actor's own record only                  |

> Company isolation is enforced at the repository layer — all queries are automatically scoped to the actor's company. There is no separate `company` scope.

### Granting / revoking per user

```
POST /api/users/:id/grant-permission   { permission: "userProfile.compensation:write:*" }
POST /api/users/:id/revoke-permission  { permission: "userProfile.compensation:write:*" }
```

Both endpoints require the caller to have any `usersManagement:write:{scope}` permission.

### Subject-specific access endpoint

```
GET /api/users/:id/accessForSubject
```

Returns `IActorAccessOnSubject` — whether the authenticated actor can edit the subject user and which profile sections they can read or write:

```json
{
    "canEdit": true,
    "sections": {
        "identity": { "read": true, "write": true },
        "contact": { "read": true, "write": false },
        "employment": { "read": true, "write": true },
        "education": { "read": false, "write": false },
        "compensation": { "read": false, "write": false }
    }
}
```

The Edit User page resolver calls this endpoint before the component loads; sections with `read: false` are hidden, sections with `read: true, write: false` are shown read-only.

---

## Checking Permissions on the Server

The `permission.middleware.ts` factory accepts one or more required permission keys and returns an Express middleware that:

1. Reads the effective permissions from the JWT-decoded user (computed after auth middleware runs).
2. Checks that the user holds **any** (or **all**, depending on variant) required permissions.
3. Calls `next()` or responds `403 Forbidden`.

Example usage in a route file:

```ts
router.get("/", userHasPermission(PermissionKeys.USERS_MANAGEMENT_READ_ALL), controller.list);
router.put(
    "/:id",
    userHasAnyPermission([PermissionKeys.USERS_MANAGEMENT_WRITE_ALL, PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT]),
    controller.update,
);
```

For subject-specific checks (does actor have write access to _this particular user_?), use the policy functions in `server/src/policies/user.policy.ts` rather than route-level middleware. The `buildActorAccessOnSubject(actorUser, subjectUser)` function computes the full section-level access object in one call.

---

## Checking Permissions on the Client

The Angular app exposes a `PermissionChecker` / `PermissionService` in `client/src/app/core/` that reads the effective permission set from the current user state. Components and route guards use this service to show/hide UI elements and protect navigation.

The company field visibility across all management pages (users, roles, departments, etc.) is a concrete example: a single shared permission check determines whether the "Company" column/field is shown, without duplicating logic per module.

---

## Permissions UI Page

The dedicated Permissions page (`client/src/app/features/permissions/`) provides an admin interface for viewing and managing permission assignments per user.

---

## Related Files

| File                                                 | Purpose                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| `server/src/enums/permissions.enum.ts`               | Source of truth for all permission keys (server)           |
| `client/src/app/core/enums/permissions.enum.ts`      | Client mirror — must stay in sync with server              |
| `server/src/middleware/permission.middleware.ts`     | Route-level permission guard middleware                    |
| `server/src/policies/user.policy.ts`                 | Subject-specific access logic; `buildActorAccessOnSubject` |
| `server/src/interfaces/user.interface.ts`            | `IActorAccessOnSubject`, `IProfileSectionAccess`           |
| `server/src/models/role.model.ts`                    | Role Mongoose schema                                       |
| `server/src/services/role.service.ts`                | Role business logic                                        |
| `server/src/repositories/`                           | Role repository (company-scoped queries)                   |
| `client/src/app/features/roles/`                     | Roles management UI                                        |
| `client/src/app/features/permissions/`               | Permissions management UI                                  |
| `client/src/app/core/services/permission.service.ts` | Client-side synchronous permission helpers                 |
| `client/src/app/core/guards/`                        | Route guards using permission checks                       |
