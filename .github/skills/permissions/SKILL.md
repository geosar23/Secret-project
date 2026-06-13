---
name: permissions
description: >
    Domain knowledge for the Permissions feature. USE WHEN: adding new permission categories/scopes/actions,
    extending PermissionKeys, writing permission guards (middleware or Angular), using PermissionChecker,
    editing the permissions page, adding permission checks to controllers, working with effective permissions,
    wildcard matching, sub-category inheritance, or PermissionService. Covers: permissions.enum (client +
    server), PermissionChecker, permission.middleware, PermissionService, permission.utils, AccessContext,
    PermissionsComponent, definePermissions factory, and prefixedKeys.
---

# Permissions Feature

## Key Files

| Layer                         | File                                                             |
| ----------------------------- | ---------------------------------------------------------------- |
| Server enum (source of truth) | `server/src/enums/permissions.enum.ts`                           |
| Client enum (mirrors server)  | `client/src/app/core/enums/permissions.enum.ts`                  |
| Server checker utility        | `server/src/utils/permission-checker.ts`                         |
| Server middleware             | `server/src/middleware/permission.middleware.ts`                 |
| Server interface              | `server/src/interfaces/permission.interface.ts`                  |
| Client service                | `client/src/app/core/services/permission.service.ts`             |
| Client utility                | `client/src/app/core/utils/permission.utils.ts`                  |
| Client interface              | `client/src/app/core/interfaces/permission.interface.ts`         |
| Permissions page              | `client/src/app/features/permissions/permissions.component.ts`   |
| Permissions page HTML         | `client/src/app/features/permissions/permissions.component.html` |
| Factory tests                 | `server/src/__tests__/permission-factory.test.ts`                |

---

## Permission String Format

```
{category}:{action}:{scope}
```

Examples:

- `*:*:*` — full superadmin wildcard
- `usersManagement:read:*` — read all users in your company
- `userProfile:write:department` — write profiles of users in your department
- `userProfile.identity:read:self` — read own identity sub-profile

---

## Enums

### `PermissionCategories`

| Enum value                     | String value                 | Actions available |
| ------------------------------ | ---------------------------- | ----------------- |
| `ALL`                          | `*`                          | `*`               |
| `USERS_MANAGEMENT`             | `usersManagement`            | `read`, `write`   |
| `USER_CREATE`                  | `userCreate`                 | `write`           |
| `COUNTRIES_MANAGEMENT`         | `countriesManagement`        | `read`, `write`   |
| `DEPARTMENTS_MANAGEMENT`       | `departmentsManagement`      | `read`, `write`   |
| `SUB_DEPARTMENTS_MANAGEMENT`   | `subDepartmentsManagement`   | `read`, `write`   |
| `EMPLOYMENT_TITLES_MANAGEMENT` | `employmentTitlesManagement` | `read`, `write`   |
| `LEVELS_MANAGEMENT`            | `levelsManagement`           | `read`, `write`   |
| `OFFICES_MANAGEMENT`           | `officesManagement`          | `read`, `write`   |
| `USER_PROFILE`                 | `userProfile`                | `read`, `write`   |
| `USER_PROFILE_IDENTITY`        | `userProfile.identity`       | `read`, `write`   |
| `USER_PROFILE_CONTACT`         | `userProfile.contact`        | `read`, `write`   |
| `USER_PROFILE_EMPLOYMENT`      | `userProfile.employment`     | `read`, `write`   |
| `USER_PROFILE_EDUCATION`       | `userProfile.education`      | `read`, `write`   |
| `USER_PROFILE_COMPENSATION`    | `userProfile.compensation`   | `read`, `write`   |
| `ROLES_MANAGEMENT`             | `rolesManagement`            | `read`, `write`   |
| `RESET_PASSWORD`               | `resetPassword`              | `write`           |

Sub-categories use dot notation (`userProfile.identity`). The wildcard checker also honours parent-category permissions for sub-categories (e.g. `userProfile:write:*` satisfies `userProfile.identity:write:*`).

> **User management split**: `usersManagement:read:{scope}` gates listing/viewing the users list. `usersManagement:write:{scope}` gates the Edit User page and grant/revoke endpoints. `userCreate:write:{scope}` gates new-user creation and scopes which country, department, and manager the actor may assign.

### `PermissionActions`

| Enum value | String value |
| ---------- | ------------ |
| `ALL`      | `*`          |
| `READ`     | `read`       |
| `WRITE`    | `write`      |
| `CREATE`   | `create`     |

### `PermissionScopes`

| Enum value           | String value         | Meaning                                      |
| -------------------- | -------------------- | -------------------------------------------- |
| `ALL`                | `*`                  | All records within the actor's company       |
| `DEPARTMENT`         | `department`         | Records in the actor's department            |
| `COUNTRY`            | `country`            | Records in the actor's country               |
| `DEPARTMENT_COUNTRY` | `department-country` | Records matching both department and country |
| `MANAGED`            | `managed`            | Records where actor is the direct manager    |
| `SELF`               | `self`               | The actor's own record only                  |

> **Note**: `COMPANY` and `OWN` scopes were removed. Company isolation is enforced at the repository layer (all queries are auto-scoped to `{ company: actorUser.company }`), making a dedicated `company` scope redundant — `*` already means "all within my company".

---

## Permission Factory

### `definePermissions(category, { actions, scopes })`

Generates a typed object with every `ACTION_SCOPE` key combination:

```ts
const LEAVES_PERMISSIONS = definePermissions("leaves", {
    actions: ["read", "approve"],
    scopes: ["*", "managed"],
});
// LEAVES_PERMISSIONS.READ_ALL        → "leaves:read:*"
// LEAVES_PERMISSIONS.APPROVE_MANAGED → "leaves:approve:managed"
```

Key naming rules:

- `"*"` → `ALL`
- `"department-country"` → `DEPARTMENT_COUNTRY`
- anything else → `Uppercase(value)`

### `prefixedKeys(prefix, obj)`

Prepends a prefix to every key:

```ts
prefixedKeys("LEAVES", { READ_ALL: "leaves:read:*" });
// → { LEAVES_READ_ALL: "leaves:read:*" }
```

Used to assemble the flat `PermissionKeys` map.

---

## `PermissionKeys` (flat constant map)

The canonical flat object used everywhere in code:

```ts
PermissionKeys.ALL; // "*:*:*"
PermissionKeys.USERS_MANAGEMENT_READ_ALL; // "usersManagement:read:*"
PermissionKeys.USERS_MANAGEMENT_WRITE_ALL; // "usersManagement:write:*"
PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT; // "usersManagement:write:department"
PermissionKeys.USER_CREATE_WRITE_ALL; // "userCreate:write:*"
PermissionKeys.USER_CREATE_WRITE_MANAGED; // "userCreate:write:managed"
PermissionKeys.USER_PROFILE_READ_SELF; // "userProfile:read:self"
PermissionKeys.USER_PROFILE_WRITE_ALL; // "userProfile:write:*"
PermissionKeys.USER_PROFILE_IDENTITY_READ_DEPARTMENT; // "userProfile.identity:read:department"
PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_ALL; // "userProfile.compensation:write:*"
PermissionKeys.ROLES_MANAGEMENT_READ_ALL; // "rolesManagement:read:*"
PermissionKeys.ROLES_MANAGEMENT_WRITE_ALL; // "rolesManagement:write:*"
```

**To add a new category**: add entry to `PermissionCategories` + `PermissionCategoriesStrings`, call `definePermissions(...)`, then spread `prefixedKeys(...)` into `PermissionKeys` — in **both** client and server enum files.

---

## Wildcard Matching Logic

Both client (`hasPermission`) and server (`matchesWildcard`) use the same algorithm: test all 8 wildcard combinations against the effective permission set.

For a required permission `cat:action:scope`, the 8 candidates checked are:

```
*:*:*
cat:*:*
*:action:*
*:*:scope
cat:action:*
cat:*:scope
*:action:scope
cat:action:scope   ← exact match
```

Any match → access granted.

**Sub-category fallback (server only)**: if `cat` contains a `.` (e.g. `userProfile.identity`), the parent category (`userProfile`) is also checked with 4 wildcard combinations.

---

## Effective Permissions

A user's effective permissions = `(role.permissions ∪ grantedPermissions) ∖ revokedPermissions`

### Server (`getEffectivePermissions` in `permission-checker.ts`)

```ts
const effective = getEffectivePermissions(user); // → Set<string>
```

- `user.role` is populated at runtime with `{ _id, permissions: string[] }`
- `user.grantedPermissions` and `user.revokedPermissions` are `string[]`

### Client (`PermissionService.computeEffective`)

```ts
[...rolePerms, ...grantedPerms].filter(p => !revokedPerms.has(p));
```

Called internally; not exposed directly — use `hasPermission()` or `PermissionService`.

---

## Server Utilities (`permission-checker.ts`)

```ts
// One-shot async checks (loads user effective perms each call)
PermissionChecker.canAccess(user, permissionKey)          → Promise<boolean>
PermissionChecker.hasAnyPermission(user, permissionKeys[]) → Promise<boolean>
PermissionChecker.hasAllPermissions(user, permissionKeys[]) → Promise<boolean>

// Build actor context for policies
buildActorContext(user) → AccessContext["actor"]

// Direct set-based check (synchronous)
matchesWildcard(effectivePerms: Set<string>, required: string) → boolean

// Get effective set (synchronous)
getEffectivePermissions(user) → Set<string>
```

---

## User Policy Functions (`server/src/policies/user.policy.ts`)

Subject-specific access decisions (require both actor and subject user documents to be populated):

```ts
// Page-level gate: can actor open the Edit User page for subject?
canManageUser(actorUser, subjectUser): boolean    // usersManagement:write:{scope}

// Scope gate: can actor create a user with the given country/dept/manager?
canCreateUser(actorUser, payload): UserCreateAccessResult

// Profile section checks
canViewUser(actorUser, subjectUser): boolean      // usersManagement:read:{scope}
canViewUserProfile(actorUser, subjectUser): boolean

// Per-section read (userProfile.<section>:read:{scope})
canReadUserProfileIdentity(actorUser, subjectUser): boolean
canReadUserProfileContact(actorUser, subjectUser): boolean
canReadUserProfileEmployment(actorUser, subjectUser): boolean
canReadUserProfileEducation(actorUser, subjectUser): boolean
canReadUserProfileCompensation(actorUser, subjectUser): boolean

// Per-section write (userProfile.<section>:write:{scope})
canWriteUserProfileIdentity(actorUser, subjectUser): boolean
canWriteUserProfileContact(actorUser, subjectUser): boolean
canWriteUserProfileEmployment(actorUser, subjectUser): boolean
canWriteUserProfileEducation(actorUser, subjectUser): boolean
canWriteUserProfileCompensation(actorUser, subjectUser): boolean

// Composite builder — called once per request by GET /:id/accessForSubject
buildActorAccessOnSubject(actorUser, subjectUser): IActorAccessOnSubject
```

### `IActorAccessOnSubject`

Returned by `GET /api/users/:id/accessForSubject` and consumed by the Edit User resolver:

```ts
interface IProfileSectionAccess {
    read: boolean;
    write: boolean;
}

interface IActorAccessOnSubject {
    canEdit: boolean; // usersManagement:write:{scope} — gates the page
    sections: {
        identity: IProfileSectionAccess; // userProfile.identity
        contact: IProfileSectionAccess; // userProfile.contact
        employment: IProfileSectionAccess; // userProfile.employment
        education: IProfileSectionAccess; // userProfile.education
        compensation: IProfileSectionAccess; // userProfile.compensation
    };
}
```

The client uses `canEdit` to guard the route. Inside the Edit User page it uses `sections.*` to hide (`read: false`), show as read-only (`read: true, write: false`), or make editable (`read: true, write: true`) each profile section.

---

## Server Middleware (`permission.middleware.ts`)

Route-level guards. Each loads the user from DB, builds effective permissions, then calls the corresponding `PermissionChecker` method.

```ts
// Require a single permission
router.get("/", userHasPermission(PermissionKeys.USERS_MANAGEMENT_READ_ALL), handler);

// Require ANY of several permissions
router.put("/:id", userHasAnyPermission([PermissionKeys.ROLES_MANAGEMENT_ALL_ALL, PermissionKeys.ALL]), handler);

// Require ALL of several permissions
router.post("/", userHasAllPermissions([perm1, perm2]), handler);
```

Responses on failure:

- `401` — no token or user not found
- `403` — insufficient permissions (`{ message, required | requiredAny | requiredAll }`)

---

## Client Service (`PermissionService`)

Exposes synchronous helpers for checking the local user's effective permissions in components and guards.

```ts
// Synchronous (safe in constructors/field initializers after auth bootstrap)
permissionService.canCreateUser(): boolean  // userCreate:write:{scope}
permissionService.canEditUser(): boolean    // usersManagement:write:{scope} (broad check — use resolver for subject-specific check)
```

Add more helpers following the same `hasPermission(computeEffective(user), PermissionKeys.X)` pattern.

Internal:

```ts
private computeEffective(user: IUser): string[]
// returns [...role.permissions, ...grantedPermissions].filter(p => !revokedPermissions.includes(p))
```

---

## Client Utility (`permission.utils.ts`)

```ts
hasPermission(effectivePermissions: string[], required: string): boolean
```

Pure function — use when you already have the effective permissions array (e.g. from `getEffectivePermissions` API response). Uses the same 8-candidate wildcard algorithm as the server.

---

## `AccessContext` Interface

Used in server policies for ABAC:

```ts
interface AccessContext<TResource = unknown> {
    actor: {
        id: string;
        companyId: string;
        departmentId?: string;
        countryId?: string;
        managerId?: string;
        permissions: Set<PermissionKey>;
    };
    resource: TResource;
    action: PermissionActions;
}
```

Build the actor portion with `buildActorContext(user)`.

---

## Permissions Page (`PermissionsComponent`)

Located at `client/src/app/features/permissions/`.

**Features:**

- Displays the current user's effective permissions grouped by `PermissionCategories`
- Each permission shown as `granted` (green check) or `denied` (red cancel) icon
- **"View As Role"** mode: select any role from the dropdown → `toggleRoleImpersonation()` rebuilds the permission grid using that role's permissions only (no granted/revoked applied)
- `StickyAlertComponent` banner shown while view-as-role is active
- Role hierarchy displayed as chips with arrows

**Key methods:**

- `buildForRole(rolePerms, granted, revoked)` — computes effective set and calls `buildPermissionCategoriesFromConstants`
- `buildPermissionCategoriesFromConstants(effectivePerms)` — groups all `PermissionKeys` by category prefix, sets `hasPermission` flag per key
- `toggleRoleImpersonation()` — enables/disables view-as-role mode

---

## Adding a New Permission Category (Checklist)

1. Add entry to `PermissionCategories` enum (both client + server)
2. Add entry to `PermissionCategoriesStrings` (both client + server)
3. Call `definePermissions(PermissionCategories.NEW, { actions: [...], scopes: [...] })`
4. Spread `prefixedKeys("NEW", NEW_PERMISSIONS)` into `PermissionKeys` (both client + server)
5. Use keys via `PermissionKeys.NEW_ACTION_SCOPE` in guards, controllers, and components
