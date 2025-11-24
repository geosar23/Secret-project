# Server Architecture - MVC Pattern

## Overview

This server follows the **MVC (Model-View-Controller)** pattern, organized by technical layers rather than business domains.

## Folder Structure

```
src/
├── controllers/      # HTTP request handlers
├── services/         # Business logic layer
├── models/           # Database schemas (Mongoose)
├── routes/           # Route definitions
├── middleware/       # Request interceptors
├── interfaces/       # TypeScript type definitions
├── enums/            # Constant enumerations
├── utils/            # Helper functions and utilities
├── config/           # Configuration files
├── db/               # Database connection and initialization
├── api/              # Main API router composition
├── app.ts            # Express app configuration
└── server.ts         # Server entry point
```

## Request Flow

### Standard Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST                           │
│                              ↓                                   │
│                         Route Layer                              │
│                    (routes/*.routes.ts)                          │
│                              ↓                                   │
│                      Middleware Chain                            │
│                   (middleware/*.ts)                              │
│                  - CORS, JSON parsing                            │
│                  - Authentication                                │
│                  - Authorization/Permissions                     │
│                  - Rate limiting                                 │
│                              ↓                                   │
│                       Controller                                 │
│                  (controllers/*.ts)                              │
│                  - Validate request                              │
│                  - Extract parameters                            │
│                  - Call service                                  │
│                  - Format response                               │
│                              ↓                                   │
│                        Service                                   │
│                   (services/*.ts)                                │
│                  - Business logic                                │
│                  - Data validation                               │
│                  - Transaction management                        │
│                  - Call models                                   │
│                              ↓                                   │
│                         Model                                    │
│                    (models/*.ts)                                 │
│                  - Database schema                               │
│                  - Data validation                               │
│                  - Database operations                           │
│                              ↓                                   │
│                       DATABASE                                   │
│                      (MongoDB)                                   │
│                              ↓                                   │
│                    Response flows back                           │
│                  Model → Service → Controller                    │
│                              ↓                                   │
│                      Error Middleware                            │
│              (middleware/error.middleware.ts)                    │
│                  - Catch errors                                  │
│                  - Format error response                         │
│                              ↓                                   │
│                      JSON RESPONSE                               │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Layer Responsibilities

### 1. Routes (`routes/`)

**Purpose:** Map HTTP endpoints to controller methods

**Example:**

```typescript
// routes/user.routes.ts
router.get("/:id", UserController.getById);
router.post("/", UserController.create);
```

**Responsibilities:**

- Define URL patterns
- Map HTTP methods to controllers
- Apply route-specific middleware

---

### 2. Middleware (`middleware/`)

**Purpose:** Intercept and process requests before they reach controllers

**Types:**

- `auth.middleware.ts` - Verify JWT tokens, attach user to request
- `permission.middleware.ts` - Check user permissions
- `error.middleware.ts` - Global error handler

**Example:**

```typescript
// middleware/auth.middleware.ts
export const authMiddleware = (req, res, next) => {
    // Verify token
    // Attach user to req.user
    // Call next() or send error
};
```

**Responsibilities:**

- Authentication
- Authorization
- Request validation
- Error handling
- Logging

---

### 3. Controllers (`controllers/`)

**Purpose:** Handle HTTP requests and responses

**Example:**

```typescript
// controllers/user.controller.ts
export const UserController = {
    async getById(req, res) {
        try {
            const user = await UserService.getById(req.params.id);
            res.json({ success: true, user });
        } catch (error) {
            res.status(500).json({ success: false, error });
        }
    },
};
```

**Responsibilities:**

- Extract request parameters
- Call appropriate service methods
- Format responses (success/error)
- Set HTTP status codes
- NO business logic

---

### 4. Services (`services/`)

**Purpose:** Contain business logic and orchestrate data operations

**Example:**

```typescript
// services/user.service.ts
export class UserService {
    static async getById(userId: string) {
        // Business logic
        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");

        // Additional logic
        await this.logAccess(userId);

        return user;
    }
}
```

**Responsibilities:**

- Business logic
- Data validation
- Transaction management
- Orchestrate multiple model operations
- Call other services
- NO HTTP concerns

---

### 5. Models (`models/`)

**Purpose:** Define database schemas and data operations

**Example:**

```typescript
// models/user.model.ts
const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true },
    role: { type: String, enum: Object.values(DefaultUserRoles) },
});

export const User = mongoose.model("User", UserSchema);
```

**Responsibilities:**

- Database schema definition
- Data validation at DB level
- Direct database operations
- Virtual fields, methods, hooks

---

### 6. Utils (`utils/`)

**Purpose:** Reusable helper functions

**Examples:**

- `permission-checker.ts` - Permission evaluation logic
- `role.utils.ts` - Role-related utilities
- `attribute-rules.ts` - Attribute-based access control rules

**Responsibilities:**

- Pure functions
- No side effects
- Reusable across layers

---

## Example: Complete Request Flow

### Request: `POST /api/users` (Create User)

1. **Entry Point:** Express receives request
2. **Route:** `routes/user.routes.ts` matches `/api/users` POST
3. **Middleware Chain:**
    - CORS check ✓
    - JSON parsing ✓
    - `authMiddleware` - Verifies JWT token ✓
    - `permissionMiddleware` - Checks `users:create` permission ✓
4. **Controller:** `UserController.create()`
    - Extracts `{ name, email, role }` from request body
    - Calls `UserService.create(data)`
5. **Service:** `UserService.create()`
    - Validates email format
    - Checks if email already exists
    - Hashes password
    - Calls `User.create()`
6. **Model:** `User.create()`
    - Validates against schema
    - Saves to MongoDB
    - Returns created user document
7. **Response Flow:**
    - Model returns user → Service
    - Service returns user → Controller
    - Controller formats: `{ success: true, user }`
    - Sends HTTP 201 Created
8. **Error Scenario:**
    - If error occurs at any step
    - Thrown error caught by `errorMiddleware`
    - Formats error response
    - Sends appropriate HTTP status code

---

## Permission Check Flow

### Request: `GET /api/employees/:id`

```
1. authMiddleware
   ├─ Verify JWT token
   ├─ Decode user info
   └─ Attach req.user

2. permissionMiddleware (optional on route)
   ├─ Extract required permission: 'employees:view:self'
   ├─ Get user from req.user
   └─ Call PermissionChecker.canAccess()
       ├─ Check GOD role bypass
       ├─ Check revoked permissions
       ├─ Check granted permissions
       ├─ Get role permissions from DB (via RoleService)
       ├─ Match permission with wildcards
       ├─ Check attribute-based rules (ABAC)
       └─ Return true/false

3. Controller
   ├─ If permission denied → 403 Forbidden
   └─ If allowed → proceed to service
```

---

## Database Initialization Flow

### Startup: `server.ts`

```
1. Load environment variables
2. Import app from app.ts
3. Connect to MongoDB (connectDB())
4. Initialize database (initializeDatabase())
   └─ RoleService.initializeSystemRoles()
      ├─ Check if system roles exist
      ├─ Create/update GOD role
      ├─ Create/update SUPER_ADMIN role
      ├─ Create/update ADMIN role
      ├─ Create/update HR role
      ├─ Create/update MANAGER role
      └─ Create/update EMPLOYEE role
5. Start server on port
```

---

## Key Design Principles

### 1. Separation of Concerns

- Each layer has a single responsibility
- Controllers don't contain business logic
- Services don't handle HTTP
- Models don't contain business rules

### 2. Dependency Direction

```
Controllers → Services → Models
     ↓
  Middleware → Utils
```

- Upper layers depend on lower layers
- Lower layers never import from upper layers

### 3. Error Handling

- Controllers catch and format errors
- Services throw meaningful errors
- Global error middleware handles uncaught errors

### 4. Testability

- Services can be tested without HTTP
- Utils are pure functions
- Models can be tested with test database

---

## Adding a New Feature

### Example: Add "Departments" feature

1. **Create Model** (`models/department.model.ts`)

    ```typescript
    const DepartmentSchema = new Schema({...});
    export const Department = mongoose.model('Department', DepartmentSchema);
    ```

2. **Create Interface** (`interfaces/department.interface.ts`)

    ```typescript
    export interface IDepartment {
        name: string;
        managerId: string;
        // ...
    }
    ```

3. **Create Service** (`services/department.service.ts`)

    ```typescript
    export class DepartmentService {
        static async create(data) {
            /* business logic */
        }
        static async getAll() {
            /* business logic */
        }
    }
    ```

4. **Create Controller** (`controllers/department.controller.ts`)

    ```typescript
    export const DepartmentController = {
        async create(req, res) {
            /* HTTP handling */
        },
    };
    ```

5. **Create Routes** (`routes/department.routes.ts`)

    ```typescript
    router.post("/", DepartmentController.create);
    router.get("/", DepartmentController.getAll);
    ```

6. **Register Routes** (`api/routes.ts`)
    ```typescript
    import departmentRouter from "../routes/department.routes";
    router.use("/departments", departmentRouter);
    ```

---

## Best Practices

### Controllers

- ✅ Keep thin - just HTTP handling
- ✅ Use try/catch for error handling
- ✅ Return consistent response format
- ❌ Don't put business logic here
- ❌ Don't access database directly

### Services

- ✅ Contain all business logic
- ✅ Throw meaningful errors
- ✅ Use transactions for multi-step operations
- ✅ Can call other services
- ❌ Don't access req/res objects
- ❌ Don't format HTTP responses

### Models

- ✅ Define schema validation
- ✅ Add indexes for performance
- ✅ Use mongoose hooks when needed
- ❌ Don't put business logic in models
- ❌ Keep models focused on data structure

### Middleware

- ✅ Keep focused on single concern
- ✅ Always call next() or send response
- ✅ Attach data to req object if needed
- ❌ Don't put business logic here

---

## Environment Variables

Located in `.env` file:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hr-saas
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:4200
USE_MOCK_DB=false
```

---

## Common Patterns

### Authentication Required

```typescript
router.get("/protected", authMiddleware, Controller.method);
```

### Permission Required

```typescript
router.post("/admin", authMiddleware, permissionMiddleware("admin:create"), Controller.method);
```

### Error Handling

```typescript
// In controller
try {
    const result = await Service.method();
    res.json({ success: true, data: result });
} catch (error) {
    res.status(500).json({
        success: false,
        error: error.message,
    });
}
```

---

## Related Documentation

- `ROLES_DATABASE.md` - Role configuration and permission system
- API documentation (coming soon)
