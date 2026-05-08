---
name: roles
description: >
    Domain knowledge for the Roles feature. USE WHEN: adding/editing the role dialog, role list page,
    role service, role model, role permissions, role API routes, or anything related to creating,
    updating, or deleting roles. Covers: RoleDialogComponent, RolesComponent, RoleService (client +
    server), RoleModel, RoleRepository, RoleController, role interfaces, system role constraints,
    permission groups, and tenant scoping.
---

# Roles Feature

## Key Files

| Layer              | File                                                                   |
| ------------------ | ---------------------------------------------------------------------- |
| Client dialog      | `client/src/app/features/roles/role-dialog/role-dialog.component.ts`   |
| Client dialog HTML | `client/src/app/features/roles/role-dialog/role-dialog.component.html` |
| Client list page   | `client/src/app/features/roles/roles.component.ts`                     |
| Client service     | `client/src/app/core/services/role.service.ts`                         |
| Client interface   | `client/src/app/core/interfaces/role.interface.ts`                     |
| Server controller  | `server/src/controllers/role.controller.ts`                            |
| Server service     | `server/src/services/role.service.ts`                                  |
| Server repository  | `server/src/repositories/role.repository.ts`                           |
| Server model       | `server/src/models/role.model.ts`                                      |
| Server interface   | `server/src/interfaces/role.interface.ts`                              |
| Server routes      | `server/src/routes/role.routes.ts`                                     |

---

## Data Model

### Server `IRole` (Mongoose)

```ts
{
  _id: Types.ObjectId;
  role: DefaultUserRoles | string; // slug, unique (e.g. "manager" or DefaultUserRoles enum)
  name: string;                    // display name, unique
  description: string;
  level: number;                   // hierarchy power (higher = more powerful); custom roles default to 55
  permissions: string[];           // array of PermissionKeys strings
  isSystemRole: boolean;           // cannot be created/deleted/deactivated via API
  company?: Types.ObjectId;        // undefined for system roles; required for custom roles
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}
```

### Client `IRole`

```ts
{
  _id: string;
  name: string;
  description?: string;
  role: string;
  company?: ICompany;       // populated { _id, name }
  permissions?: string[];
  isSystemRole?: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### `ICreateRoleRequest` (client → server)

```ts
{ name: string; description?: string; permissions?: string[]; }
```

### `IUpdateRoleRequest` (client → server)

```ts
{ name?: string; description?: string; permissions?: string[]; isActive?: boolean; }
```

---

## API Routes (`/api/roles`)

| Method | Path                     | Handler              | Notes                                                                          |
| ------ | ------------------------ | -------------------- | ------------------------------------------------------------------------------ |
| GET    | `/hierarchy`             | `getRoleHierarchy`   | Sorted by `level` descending                                                   |
| GET    | `/:roleType/permissions` | `getRolePermissions` | Stub — returns `{}`                                                            |
| GET    | `/`                      | `getAllRoles`        | Company-scoped                                                                 |
| GET    | `/:id`                   | `getRoleById`        | Company-scoped                                                                 |
| POST   | `/`                      | `createRole`         | Custom roles only                                                              |
| PUT    | `/:id`                   | `updateRole`         | System roles need `ROLES_MANAGEMENT_ALL_ALL` or `ROLES_MANAGEMENT_ALL_COMPANY` |
| DELETE | `/:id`                   | `deleteRole`         | System roles blocked at model level                                            |

---

## Role Dialog (`RoleDialogComponent`)

### Modes

- **`create`** — opens empty form, calls `RoleService.createRole()`
- **`edit`** — pre-fills form from `data.role`, calls `RoleService.updateRole(id, ...)`

Opened from `RolesComponent` via:

```ts
this.dialog.open(RoleDialogComponent, {
  width: "460px",
  maxWidth: "95vw",
  data: { mode: "create" | "edit", role?: IRole } as RoleDialogData,
})
```

Dialog returns `IRole | undefined` on close.

### Form Fields

| Field       | Control name  | Validators             | Notes                                                                                 |
| ----------- | ------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| Role Name   | `name`        | required, minLength(2) | sent as `name`; server derives `role` slug (lowercase + underscores)                  |
| Description | `description` | maxLength(255)         | optional                                                                              |
| Permissions | `permissions` | —                      | multi-select grouped by `PermissionCategoriesStrings`; chips shown below for selected |
| Is Active   | `isActive`    | —                      | slide toggle; only relevant in edit mode                                              |

### Permission Groups

Built in `buildPermissionGroups()`:

- Groups `PermissionKeys` enum values by the prefix before the first `:`
- Category labels come from `PermissionCategoriesStrings`
- Rendered as `<mat-optgroup>` inside a multiple `<mat-select>`
- Selected permissions shown as `<mat-chip-set>` with a **Clear** button

### Permission Gate

- `canEditSystemRoles` — requires `ROLES_MANAGEMENT_ALL_ALL` or `ROLES_MANAGEMENT_ALL_COMPANY`; checked in `RolesComponent` before opening edit dialog

---

## Roles List Page (`RolesComponent`)

### Table columns

Fixed: `name`, `description`, `permissions`, `type`, `status`, `createdAt`, `actions`

### Filters

- **Search** (`searchControl`) — debounced 300ms, matches name / company name / description / role slug / permissions
- **Role type** (`systemRoleFilterControl`) — `"all" | "system" | "custom"` via `filterPredicate`

### Actions

- **Create** — `openCreateDialog()`, prepends new role to list
- **Edit** — `openEditDialog(role)`, blocks if `isSystemRole && !canEditSystemRoles()`
- **Delete** — handled server-side; no client delete button visible in current implementation

---

## Server Business Rules

### System Roles

- Defined by `DefaultUserRoles` enum (`SUPER_ADMIN`, `ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`)
- **Cannot be created** via API (`pre("save")` hook blocks it)
- **Cannot be deleted** (`pre("deleteOne")` and `pre("findOneAndDelete")` hooks)
- **Cannot be set inactive** (`pre("save")` and `pre("findOneAndUpdate")` hooks)
- Modifying other fields requires `allowSystemRoleModification: true` passed from controller (needs `ROLES_MANAGEMENT_ALL_ALL` or `ROLES_MANAGEMENT_ALL_COMPANY`)

### Company Scoping (`roleRepository`)

- Every company sees system roles (no `company` field) plus their own custom roles.
- `$or: [{ company: ObjectId(companyId) }, { company: { $exists: false } }]` applied on all queries.
- `create()` auto-assigns `company` from the caller's `companyId`.

### Custom Role Defaults

- `level: 55`
- `isSystemRole: false`
- `role` slug = `name.toLowerCase().replace(/ /g, "_")`
- `isActive: true`

---

## Client Service (`RoleService`)

```ts
getAllRoles()          → GET  /roles
getRoleById(id)        → GET  /roles/:id
createRole(data)       → POST /roles          → JsonResponse<{ role: IRole }>
updateRole(id, data)   → PUT  /roles/:id      → JsonResponse<{ role: IRole }>
deleteRole(id)         → DELETE /roles/:id
getRoleHierarchy()     → GET  /roles/hierarchy
```

All return `Observable<JsonResponse<T>>` via `ApiService`.
