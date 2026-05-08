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
  company: Types.ObjectId;         // always required — system and custom roles are both company-scoped
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
  company: ICompany;        // populated { _id, name } — always present
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

| Method | Path                     | Handler              | Notes                                                                                   |
| ------ | ------------------------ | -------------------- | --------------------------------------------------------------------------------------- |
| GET    | `/hierarchy`             | `getRoleHierarchy`   | Sorted by `level` descending                                                            |
| GET    | `/:roleType/permissions` | `getRolePermissions` | Stub — returns `{}`                                                                     |
| GET    | `/`                      | `getAllRoles`        | Company-scoped                                                                          |
| GET    | `/:id`                   | `getRoleById`        | Company-scoped                                                                          |
| POST   | `/`                      | `createRole`         | Custom roles only                                                                       |
| PUT    | `/:id`                   | `updateRole`         | Works for system and custom roles; `name`/`role` slug silently ignored for system roles |
| DELETE | `/:id`                   | `deleteRole`         | System roles blocked at model level                                                     |

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

| Field       | Control name  | Validators             | Notes                                                                                                         |
| ----------- | ------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Role Name   | `name`        | required, minLength(2) | sent as `name`; server derives `role` slug (lowercase + underscores); **disabled** when editing a system role |
| Description | `description` | maxLength(255)         | optional                                                                                                      |
| Permissions | `permissions` | —                      | multi-select grouped by `PermissionCategoriesStrings`; chips shown below for selected                         |
| Is Active   | `isActive`    | —                      | slide toggle; only relevant in edit mode                                                                      |

### Permission Groups

Built in `buildPermissionGroups()`:

- Groups `PermissionKeys` enum values by the prefix before the first `:`
- Category labels come from `PermissionCategoriesStrings`
- Rendered as `<mat-optgroup>` inside a multiple `<mat-select>`
- Selected permissions shown as `<mat-chip-set>` with a **Clear** button

### System Role Editing Constraints

- The **edit button is always visible** for all roles (system and custom).
- When editing a system role, `name` is **disabled** in the form and a hint is displayed.
- The server silently strips `name` and `role` (slug) from any update to a system role, so those fields can never be changed regardless of client behaviour.

---

## Roles List Page (`RolesComponent`)

### Table columns

Fixed: `name`, `description`, `permissions`, `type`, `status`, `createdAt`, `actions`

### Filters

- **Search** (`searchControl`) — debounced 300ms, matches name / company name / description / role slug / permissions
- **Role type** (`systemRoleFilterControl`) — `"all" | "system" | "custom"` via `filterPredicate`

### Actions

- **Create** — `openCreateDialog()`, prepends new role to list
- **Edit** — `openEditDialog(role)`, always available; dialog disables the `name` field for system roles
- **Delete** — handled server-side; no client delete button visible in current implementation

---

## Server Business Rules

### System Roles

- Defined by `DefaultUserRoles` enum (`SUPER_ADMIN`, `ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`)
- **Cannot be created** via API (`pre("save")` hook blocks it)
- **Cannot be deleted** (`pre("deleteOne")` and `pre("findOneAndDelete")` hooks)
- **Cannot be set inactive** (`pre("save")` and `pre("findOneAndUpdate")` hooks)
- **`name` and `role` slug cannot be changed** — `RoleService.update()` strips both fields from the payload before saving when the target is a system role
- All other fields (`description`, `permissions`, `isActive`) can be updated freely, same as custom roles

### Company Scoping (`roleRepository`)

- All roles — system and custom — are scoped to a company. There are no global/shared roles.
- Each company has its own copies of the system roles (seeded at company creation), which it can freely edit (permissions, etc.) subject to the system role guards.
- `find()` / `findOne()` / `findById()` filter strictly by `{ company: ObjectId(companyId) }`.
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
