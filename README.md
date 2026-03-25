# HR SaaS Application

A full-stack HR management system built with modern web technologies. This monorepo contains both the Angular frontend and the Node.js/Express backend.

## Stack Overview

- **Frontend**: Angular 21 with Material Design
- **Backend**: Node.js + Express + TypeScript with MongoDB
- **Authentication**: JWT-based with bcryptjs hashing
- **Security**: Helmet, CORS, rate limiting, and validation
- **Development Tools**: Prettier, ESLint, Husky, Commitlint

## Prerequisites

- **Node.js** >= 16 and **npm**
- **MongoDB** (local or cloud instance)
- Optional: **Angular CLI** for enhanced frontend development

## Project Structure

```
.
├── client/               # Angular frontend application
│   ├── src/
│   ├── public/
│   └── package.json
├── server/               # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # MongoDB schemas
│   │   ├── routes/       # API route definitions
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   ├── api/          # API utilities
│   │   └── server.ts     # Entry point
│   └── package.json
└── package.json          # Root workspace configuration
```

## Getting Started

### 1. Install Dependencies

Install dependencies for the entire workspace:

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file in the `server` directory with the following variables:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/hrms
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

**Security Note**: Do NOT commit `.env` files. The `.env` file is included in `.gitignore`.

### 3. Run Development Mode

Run both client and server concurrently:

```bash
npm run dev
```

This launches:

- **Backend**: `http://localhost:3000` (Node + Express)
- **Frontend**: `http://localhost:4200` (Angular development server)

### Individual Development

**Backend only** (with auto-reload):

```bash
npm run dev:server
```

**Frontend only**:

```bash
npm run dev:client
```

## Building for Production

Build both frontend and backend:

```bash
# Backend
cd server
npm run build    # TypeScript → dist/
npm start        # Run compiled code

# Frontend
cd client
npm run build    # Angular → dist/
```

## Available Scripts

### From Root

- `npm run dev` — Run both client and server
- `npm run dev:server` — Run backend with watch mode
- `npm run dev:client` — Run frontend dev server
- `npm run format` — Format and lint all code
- `npm run lint` — Run ESLint with auto-fix

### Backend (server/)

- `npm run dev` — Start with ts-node
- `npm run dev:watch` — Start with auto-reload via nodemon
- `npm run build` — Compile TypeScript
- `npm start` — Run compiled JavaScript
- `npm run format` — Format code
- `npm run lint` — Lint TypeScript

### Frontend (client/)

- `npm start` — Run dev server
- `npm run build` — Build for production
- `npm run test` — Run unit tests

## API Endpoints

The backend provides REST API endpoints under `/api`:

- **Auth**: `/api/auth/*` — Login, logout, token refresh
- **Users**: `/api/users/*` — User management
- **Roles**: `/api/roles/*` — Role-based access control
- **Companies**: `/api/companies/*` — Company data

## Key Features

- User authentication and authorization
- Role-based access control (RBAC)
- Company and employee management
- Secure session handling with JWT
- API rate limiting and request validation
- Code formatting and linting automation
- Git hooks for commit quality (Husky + Commitlint)

## Permission System Architecture

The application uses a **scope-aware, wildcard-based permission system** that combines role-based permissions with fine-grained grants and revocations.

### How Permissions Work

#### 1. **Permission Composition**

A user's effective permissions are calculated as:

```
Effective Permissions = Role Permissions ∪ Granted Permissions \ Revoked Permissions
```

Example:

- **Role**: Has `USERS_MANAGEMENT_READ_COMPANY` permission
- **Granted**: `USER_PROFILE_ALL_COMPANY` (user manually granted)
- **Revoked**: `USERS_MANAGEMENT_ALL_SELF` (user manually revoked from role)
- **Result**: User can do everything in their company except manage their own profile

#### 2. **Permission Format**

Permissions follow the pattern: `category:action:scope`

**Categories** (e.g., from `server/src/enums/permissions.enum.ts`):

- `ALL` — System-wide access
- `USERS_MANAGEMENT` — User CRUD operations
- `USER_PROFILE` — User profile/settings operations

**Actions**:

- `READ` — View/retrieve data
- `WRITE` — Create/update data
- `ALL` — Any action

**Scopes**:

- `ALL` — Access across all companies/departments
- `COMPANY` — Limited to own company
- `DEPARTMENT` — Limited to own department
- `COUNTRY` — Limited to own country
- `MANAGED` — Only users they manage
- `OWN` — Only users they own/supervise
- `SELF` — Only their own user

#### 3. **Wildcard Permission Matching**

Permissions use **wildcard matching** across all three segments. A broader permission satisfies more specific checks.

**Example 1: `ALL_COMPANY` Permission**

```
User has: ALL:*:COMPANY  (* means wildcard)

Required checks:
✓ USERS_MANAGEMENT:READ:COMPANY     — Matches (wildcard covers all)
✓ USER_PROFILE:WRITE:COMPANY        — Matches (wildcard covers all)
✓ USERS_MANAGEMENT:READ:ALL         — ✗ Does not match (COMPANY scope doesn't cover ALL)
```

**Example 2: `USERS_MANAGEMENT_READ_COMPANY` Permission**

```
User has: USERS_MANAGEMENT:READ:COMPANY

Required checks:
✓ USERS_MANAGEMENT:READ:COMPANY     — Exact match
✗ USERS_MANAGEMENT:WRITE:COMPANY    — Does not match (READ doesn't cover WRITE)
✗ USER_PROFILE:READ:COMPANY         — Does not match (different category)
```

**Example 3: Broader Permission Subset**

```
User has: ALL:*:COMPANY  (broadest applicable permission)
          USERS_MANAGEMENT:READ:COMPANY  (more specific)

When checking "Can user read all users in company?"
→ ALL:*:COMPANY matches first → ✓ Allowed
→ No need to check the more specific permission
```

#### 4. **Permission Keys Reference**

Common permission constants defined in `server/src/enums/permissions.enum.ts`:

- `ALL` — Full system access
- `ALL_COMPANY` — Full access within own company
- `USERS_MANAGEMENT_READ_ALL` — Read all users globally
- `USERS_MANAGEMENT_READ_COMPANY` — Read users in own company
- `USERS_MANAGEMENT_ALL_ALL` — Full user management globally
- `USERS_MANAGEMENT_ALL_COMPANY` — Full user management in own company
- `USER_PROFILE_*_*` — Variants for profile management

#### 5. **Authorization Enforcement**

All sensitive endpoints enforce authorization checks:

**Example: Get User Endpoint**

```typescript
// Checks performed:
1. Is user authenticated? (JWT valid)
2. Can user VIEW this specific user?
   - Requires canViewUser() check in policies
   - Validates user scope vs target user scope
3. Scope-aware filtering applied
```

**Scope Evaluation Logic:**
For user with `USERS_MANAGEMENT_READ_COMPANY`:

- ✓ Can view users in their own company
- ✗ Cannot view users in other companies
- ✓ Can search/filter their company only

### Adding New Features (New Permissions)

When building a new feature:

1. **Define permissions** in `server/src/enums/permissions.enum.ts`

    ```typescript
    export enum PermissionCategories {
        NEW_FEATURE = "new_feature",
    }

    export const PermissionKeys = {
        NEW_FEATURE_READ_ALL: `new_feature:read:all`,
        NEW_FEATURE_ALL_COMPANY: `new_feature:*:company`,
        // ... more combinations for read/write/all + scopes
    };
    ```

2. **Create authorization policy** in `server/src/policies/`

    ```typescript
    export function canAccessFeature(actor: IUser, target: any) {
        return matchesWildcard(
            getEffectivePermissions(actor),
            "new_feature:read:all", // required permission
            buildActorContext(actor),
        );
    }
    ```

3. **Enforce in controllers** before business logic
    ```typescript
    const actor = await getActorUser(req);
    if (!canAccessFeature(actor, resource)) {
        return res.status(403).json({ message: "Access denied" });
    }
    ```

### Relevant Code Files

- **Permission Definitions**: [server/src/enums/permissions.enum.ts](server/src/enums/permissions.enum.ts)
- **Permission Checker**: [server/src/utils/permission-checker.ts](server/src/utils/permission-checker.ts) — Wildcard matching & effective permission calculation
- **Authorization Policies**: [server/src/policies/](server/src/policies/) — Feature-specific access rules
- **User Policy**: [server/src/policies/user.policy.ts](server/src/policies/user.policy.ts) — Scope-aware user access rules
- **Auth Request Util**: [server/src/utils/auth-request.util.ts](server/src/utils/auth-request.util.ts) — Actor context loading & company ID extraction

## Troubleshooting

**Backend won't start**

- Verify MongoDB is running and `MONGO_URI` is correct
- Check that port 3000 is not in use
- Review error logs in the terminal

**Frontend won't connect to backend**

- Ensure backend is running on the correct port
- Check CORS configuration in `server/src/app.ts`
- Verify network connectivity

**npm install fails**

- Try clearing npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then reinstall
- Ensure Node.js version matches prerequisites

## Contributing

Follow the commit guidelines enforced by Commitlint. The project uses Prettier for formatting and ESLint for code quality.

Run before committing:

```bash
npm run format
npm run lint
```

## License

[Add license information]
