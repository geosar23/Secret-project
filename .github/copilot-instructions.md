# HR SAAS Development Guide

## Project Overview
Full-stack HR management system with Angular 20 frontend (`client/`) and Node.js/Express/TypeScript backend (`server/`). Uses npm workspaces for monorepo management.

## Architecture Patterns

### Backend: MVC with Service Layer
- **Routes** (`server/src/routes/*.routes.ts`) → **Middleware** → **Controllers** (`server/src/controllers/*.controller.ts`) → **Services** (`server/src/services/*.service.ts`) → **Models** (`server/src/models/*.model.ts`)
- Controllers handle HTTP only (no business logic)
- Services contain all business logic and orchestrate data operations
- All services check `dbState.useMock` and gracefully fall back to `MockDatabase` if MongoDB unavailable

### Permission System: RBAC + ABAC Hybrid
Permission format: `resource:action:scope` (e.g., `employees:edit:managed`)

**Scopes define access boundaries:**
- `all` - Full access (includes all other scopes)
- `department` - Department-level access (includes managed, self)
- `managed` - Direct reports only (includes self)
- `self` - Own records only

**Permission checks via `PermissionChecker.canAccess()`:**
1. GOD role bypasses everything
2. Check explicit revocations (`user.revokedPermissions`)
3. Check temporary grants (`user.grantedPermissions` with expiration)
4. Check role permissions from database via `RoleService.getPermissions()`
5. Apply ABAC rules via `SCOPE_HANDLERS` in `server/src/utils/attribute-rules.ts`
6. Enforce multi-tenant isolation (`user.companyId === resource.companyId`)

**Role hierarchy:** `GOD > SUPER_ADMIN > ADMIN > HR > MANAGER > EMPLOYEE`

System roles initialized on startup via `RoleService.initializeSystemRoles()` in `server/src/server.ts`.

### Frontend: Standalone Components
- All components use Angular standalone API (no NgModules)
- Dependency injection via `inject()` function, not constructor
- Guards are functions: `export const authGuard = () => { ... }`
- HTTP interceptors added via `provideHttpClient(withInterceptors([authInterceptor]))`
- Services use `providedIn: 'root'` for singleton instances

## Development Workflows

### Running Dev Environment
```bash
# Root workspace - runs both concurrently
npm run dev

# Server only (with auto-reload)
cd server && npm run dev:watch

# Client only
cd client && npm start
```

**Server runs on `http://localhost:3000`**  
**Client runs on `http://localhost:4200`** (default ng serve)  
**API base path:** `/api`

### Mock Database Fallback
Server automatically uses in-memory mock database if MongoDB connection fails. Check console:
- `✅ Using real database` = MongoDB connected
- `⚠️ MongoDB connection failed - Falling back to mock database` = Using mocks

No code changes needed - all services check `dbState.useMock` internally.

### Code Quality Pipeline
- **Pre-commit hooks** (via Husky): lint-staged runs Prettier + ESLint
- **Commit convention:** Commitlint enforces conventional commits (feat/fix/style/chore/security/docs/refactor/test/perf/ci/build/revert)
- **Format command:** `npm run format` (root) - Prettier + ESLint fix for entire workspace
- **Lint command:** `npm run lint` (root) - ESLint for server + client

**Prettier config:** 4 spaces, double quotes, semicolons, 120 print width, trailing commas

## Key Conventions

### Authentication Flow
1. Client sends credentials to `/api/auth/login`
2. Server returns JWT + user object
3. Client stores token in `localStorage` ("token" key)
4. `AuthService.initializeAuth()` restores user session on app load
5. `authInterceptor` adds `Authorization: Bearer <token>` header to all requests
6. Server `authMiddleware` verifies JWT and attaches `req.decoded` with `JwtPayload`

**Token payload structure:**
```typescript
{ id: string; email: string; name: string; role: DefaultUserRoles }
```

### Adding Protected Routes
**Server:**
```typescript
router.get("/endpoint", authMiddleware, Controller.method);
// For permission checks, call PermissionChecker.canAccess() in controller/service
```

**Client:**
```typescript
{ path: "protected", component: MyComponent, canActivate: [authGuard] }
```

### Adding New Features (Example: Departments)
1. Create interface in `server/src/interfaces/department.interface.ts`
2. Create Mongoose model in `server/src/models/department.model.ts`
3. Add mock data methods to `server/src/db/mock-database.ts`
4. Create service in `server/src/services/department.service.ts` (check `dbState.useMock` in each method)
5. Create controller in `server/src/controllers/department.controller.ts`
6. Create routes in `server/src/routes/department.routes.ts`
7. Register in `server/src/api/routes.ts`: `router.use("/departments", authMiddleware, departmentRouter)`
8. Add permissions to `server/src/enums/permissions.enum.ts` (e.g., `departments:create`, `departments:view:all`)
9. Update role permissions in `server/src/utils/role-permissions.ts`

**Frontend:**
1. Create interface in `client/src/app/core/interfaces/department.interface.ts`
2. Create service in `client/src/app/core/services/department.service.ts` (inject `ApiService`)
3. Create standalone component in `client/src/app/features/departments/`
4. Add route to `client/src/app/app.routes.ts`

### Environment Variables
**Server** (`server/.env`):
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hr-saas
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:4200
```

**Client** (`client/src/environments/environment.ts`):
```typescript
apiUrl: "http://localhost:3000/api"
```

## Critical Files
- `server/src/app.ts` - Express app setup, middleware chain, CORS, rate limiting
- `server/src/api/routes.ts` - Central API router composition
- `server/src/utils/permission-checker.ts` - Permission evaluation engine
- `server/src/utils/attribute-rules.ts` - ABAC scope handlers (isSelf, isDirectManager, etc.)
- `server/src/config/databases.ts` - MongoDB connection with automatic mock fallback
- `client/src/app/app.config.ts` - Angular providers (router, HTTP, interceptors)
- `client/src/app/core/services/auth.service.ts` - Authentication state management

## Common Pitfalls
- **Don't hardcode auth checks in controllers** - Use `PermissionChecker` for consistent RBAC/ABAC
- **Service methods must handle both MongoDB and mock** - Always check `dbState.useMock`
- **Wildcard permissions are powerful** - `*` grants everything, `employees:*` grants all employee actions
- **Scope hierarchy matters** - Permission `employees:view:all` includes `employees:view:managed`, `employees:view:self`
- **Multi-tenant isolation is automatic** - `PermissionChecker.canAccess()` enforces `companyId` matching
- **Angular guards/interceptors are functions, not classes** - Use functional style with `inject()`
