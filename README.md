# HR SaaS Application

A full-stack HR management system built with modern web technologies. This monorepo contains both the Angular frontend and the Node.js/Express backend.

## Stack Overview

- **Frontend**: Angular 21 with Material Design
- **Backend**: Node.js + Express + TypeScript with MongoDB
- **File Storage**: Supabase Storage (profiles images, etc)
- **Authentication**: JWT-based with bcryptjs hashing
- **Security**: Helmet, CORS, rate limiting, and validation
- **Development Tools**: Prettier, ESLint, Husky, Commitlint

## Prerequisites

- **Node.js** >= 24.14.0 and **npm**
- **MongoDB** (local or cloud instance)
- **Supabase project** with Storage enabled
- **Supabase Storage bucket** (example: `hrms-saas`)
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
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=hrms-saas
```

Important:

- `SUPABASE_URL` must be the project HTTP URL (`https://...supabase.co`), not a Postgres connection string.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.

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
- `npm test` — Run unit/integration tests with Jest
- `npm run test:coverage` — Run tests with coverage report
- `npm run format` — Format code
- `npm run lint` — Lint TypeScript

### Frontend (client/)

- `npm start` — Run dev server
- `npm run build` — Build for production
- `npm run test` — Run unit tests

## API Endpoints

The backend provides REST API endpoints under `/api`:

- **Health**: `/api/health` — Basic API health and uptime
- **Auth**: `/api/auth/*` — Login and authenticated user context (`/me`)
- **Users**: `/api/users/*` — User CRUD, password change, permission grant/revoke
- **User Profile Images (Upload)**: `POST /api/users/:id/profile-image` — Upload profile image (multipart field: `image`, max 5MB, images only)
- **User Profile Images (Signed URL)**: `GET /api/users/:id/profile-image-url` — Get signed URL for profile image
- **User Profile Images (Delete)**: `DELETE /api/users/:id/profile-image` — Remove profile image
- **Roles**: `/api/roles/*` — Role CRUD, hierarchy, role permissions
- **Company Logo**: `GET /api/companies/:id/logo-url` — Get signed URL for company logo
- **Countries**: `/api/countries/*` — Country CRUD (permission-guarded)
- **Departments**: `/api/departments/*` — Department CRUD
- **Sub-Departments**: `/api/sub-departments/*` — Sub-department CRUD
- **Employment Titles**: `/api/employment-titles/*` — Employment title CRUD
- **Levels**: `/api/levels/*` — Seniority level CRUD (company-scoped)
- **Offices**: `/api/offices/*` — Office location CRUD (company-scoped)
- **User Documents**: `/api/user-documents/*` — Employee identity documents (passport, national ID, visa etc.) with Supabase Storage attachment support

## Key Features

- User authentication and authorization
- Role-based access control (RBAC)
- Multi-tenant architecture — all data strictly scoped to the authenticated user's company
- Country, department, sub-department, and employment title management
- Secure session handling with JWT
- Granular permission assignment and revocation per user
- Profile editing and change-password flow
- Profile image upload/delete with signed URL delivery
- Company logo storage and signed URL delivery
- Advanced user filtering (role, department, country)
- Company-scoped data repositories for all HR entities
- API rate limiting and request validation
- Code formatting and linting automation
- Git hooks for commit quality (Husky + Commitlint)

## Recent Functional Updates

- Removed OG company / GOD user concepts — all users and entities are now strictly tenant-isolated with no exceptions.
- Removed companies management UI — companies are provisioned outside the app; logo URL is available read-only via `/api/companies/:id/logo-url`.
- Added company logo support: Supabase Storage upload with signed URL delivery; logo displayed in the header.
- Added dedicated management modules for countries, departments, sub-departments, and employment titles.
- Expanded user administration with manager assignment, richer edit/create forms, and stronger validation.
- Added user-level permission grant/revoke endpoints and UI integrations.
- Introduced profile route context resolution and integrated profile editing/change-password workflows.
- Added Supabase Storage integration for profile images with metadata stored in MongoDB user records.
- Improved frontend responsiveness and layout behavior in tables and filter sections.

## Troubleshooting

**Backend won't start**

- Verify MongoDB is running and `MONGO_URI` is correct
- Check that port 3000 is not in use
- Verify Supabase storage env vars are present and valid (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`)
- Review error logs in the terminal

**Profile image upload fails (`fetch failed` or invalid URL errors)**

- Ensure `SUPABASE_URL` is your project URL like `https://<project-ref>.supabase.co`
- Do not use Postgres URI format (`postgresql://...`) for `SUPABASE_URL`
- Confirm the storage bucket exists and matches `SUPABASE_STORAGE_BUCKET`

**Frontend won't connect to backend**

- Ensure backend is running on the correct port
- Check CORS configuration in `server/src/app.ts`
- Verify network connectivity

**npm install fails**

- Try clearing npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then reinstall
- Ensure Node.js version matches prerequisites

## Testing

The backend uses [Jest](https://jestjs.io/) with [ts-jest](https://kulshekhar.github.io/ts-jest/), [Supertest](https://github.com/ladjs/supertest), and [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server) for in-memory integration tests — no external database required.

Tests live under `server/src/__tests__/` and cover:

- **Auth** (`auth.test.ts`): Login, `/me`, token validation, missing/invalid credentials.
- **RBAC** (`rbac.test.ts`): Permission grant/revoke endpoints, 401/403 enforcement.
- **Company isolation** (`company-isolation.test.ts`): Scoped data access per company.

Run from the `server/` directory (or via the workspace):

```bash
# From server/
npm test                 # Run all tests
npm run test:coverage    # Run with coverage report
```

## Contributing

Follow the commit guidelines enforced by Commitlint. The project uses Prettier for formatting and ESLint for code quality.

Run before committing:

```bash
npm run format
npm run lint
```

## License

[Add license information]
