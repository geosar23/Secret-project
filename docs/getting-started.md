# Getting Started

This guide walks you through setting up the project locally from scratch.

## Prerequisites

- **Node.js** >= 24.14.0 and **npm**
- **MongoDB** — local instance or a cloud cluster (e.g. MongoDB Atlas)
- **Supabase project** with Storage enabled and a storage bucket created (e.g. `hrms-saas`)
- Optional: **Angular CLI** for enhanced frontend development

## 1. Install Dependencies

From the repository root, install everything in one command (npm workspaces handles both `client/` and `server/`):

```bash
npm install
```

## 2. Environment Setup

Create a `.env` file inside `server/` (use `server/.env.example` as a template):

```env
PORT=3000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
JWT_SECRET=your-strong-secret-key-here
NODE_ENV=development
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=hrms-saas
SALARY_ENCRYPTION_KEY=64-char-hex-string
CLIENT_URL=http://localhost:4200,http://localhost
```

### Variable notes

| Variable                    | Required | Notes                                                               |
| --------------------------- | -------- | ------------------------------------------------------------------- |
| `PORT`                      | No       | Defaults to `3000`                                                  |
| `MONGO_URI`                 | Yes      | MongoDB connection string                                           |
| `JWT_SECRET`                | Yes      | Long random string; keep secret                                     |
| `NODE_ENV`                  | No       | `development` or `production`                                       |
| `SUPABASE_URL`              | Yes      | Must be the HTTPS project URL, **not** a Postgres connection string |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Server-side only; never expose to the client                        |
| `SUPABASE_STORAGE_BUCKET`   | Yes      | Must match the bucket name in your Supabase project                 |
| `SALARY_ENCRYPTION_KEY`     | Yes      | 64-char hex string — generate with `openssl rand -hex 32`           |
| `CLIENT_URL`                | No       | Comma-separated CORS origins. Defaults to `http://localhost:4200`   |

> **Security:** `.env` is in `.gitignore`. Never commit it.

The server validates all required variables at startup and exits with a clear message if anything is missing or malformed.

## 3. Run in Development Mode

### Both apps together

```bash
npm run dev
```

This launches concurrently:

- **Backend**: `http://localhost:3000` (Node + Express, ts-node)
- **Frontend**: `http://localhost:4200` (Angular dev server)

### Backend only

```bash
npm run dev:server
```

### Frontend only

```bash
npm run dev:client
```

### Seed a demo company

A fresh database has no companies, roles or users, so nobody can log in. The seed command creates one complete company so you can sign in and use the app straight away.

Run it from `server/` with `MONGO_URI` set in `server/.env`:

```bash
cd server
npm run seed:demo -- --name "Acme" --slug acme --email admin@acme.com
```

| Option       | Required | Default               | Notes                                                                     |
| ------------ | -------- | --------------------- | ------------------------------------------------------------------------- |
| `--name`     | No       | `Demo Company`        | Company display name                                                      |
| `--slug`     | No       | derived from `--name` | Lowercased, non-alphanumerics become `-`. Must be unique                  |
| `--email`    | No       | `admin@<slug>.com`    | Login email of the super admin. Must be unique across all companies       |
| `--password` | No       | random, printed once  | Prefer the random one; a value on the command line stays in shell history |

Example output:

```
Created company "Acme" (65f...)
{ roles: 5, countries: 1, departments: 5, subDepartments: 5, employmentTitles: 5, levels: 4, offices: 1, users: 1 }
Login: admin@acme.com / k3V9xQ2mT-Lw
```

Sign in at `http://localhost:4200` with that email and password.

#### What it creates

Everything belongs to the new company, so the data is isolated from other companies.

- **Roles** (system roles):
    - `super_admin`: everything.
    - `admin`: manage users, profiles, roles and all HR entities; create users; reset passwords.
    - `hr`: manage users and profiles; create users; reset passwords; read HR entities.
    - `manager`: read their direct reports and their own profile.
    - `employee`: read their own record and profile.
- **Country**: Greece.
- **Org structure**: Engineering, HR, Marketing, Finance and Sales. Each has one sub-department and one employment title (for example Engineering, Software Development, Software Engineer).
- **Levels**: Junior, Mid, Senior, Lead.
- **Office**: Athens HQ, in Greece.
- **User**: one super admin.

The seed creates no demo employees. Add them through the Users page with the super admin.

#### Good to know

- It is **not idempotent**. It stops with an error if the slug or the admin email already exists, and writes nothing in that case. Run it again with a different `--slug` and `--email` to create another company.
- The Roles schema declares `role` and `name` as unique, but index creation is disabled. If your database already has unique indexes on those fields, seeding a second company fails on a duplicate key. Drop or scope those indexes first.
- Seeded system roles cannot be deleted or deactivated from the UI.
- It writes straight to the database named in `MONGO_URI`. Double-check the URI before running it against anything other than a development database.
- The logic lives in `server/src/services/seed.service.ts` (`seedDemoCompany`). Change the role permissions or the starter org structure there. The command-line wrapper is `server/src/scripts/seedDemoCompany.ts`.

## 4. Building for Production

### Backend

```bash
cd server
npm run build   # TypeScript → dist/
npm start       # Run compiled output
```

### Frontend

```bash
cd client
npm run build   # Angular → dist/browser/
```

## 5. Running with Docker

Docker is the recommended way to run the full stack locally or deploy to a PaaS.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Build and run both services

```bash
# From the repository root
docker compose build
docker compose up
```

- **Frontend** → http://localhost
- **Backend** → http://localhost:3000

The Docker setup reads `server/.env` automatically. No changes to the env file are needed — `CLIENT_URL` is set to accept both `http://localhost:4200` (local dev) and `http://localhost` (Docker) by default.

### Deploying to a PaaS (Railway, Render, Fly.io)

Each service has its own `Dockerfile` and is deployed independently:

1. **Deploy the backend first** — set all env vars from `server/.env.example` in the platform dashboard.
2. **Deploy the frontend** — pass your live backend URL as a build argument:
    ```bash
    docker build --build-arg API_URL=https://your-backend.railway.app/api ./client
    ```
    On PaaS platforms this is set in the build settings UI, not the CLI.

> The Angular API URL is baked in at **build time** via the `API_URL` build arg. The default is `http://localhost:3000/api`.

## Troubleshooting

**Backend won't start**

- Confirm MongoDB is running and `MONGO_URI` is reachable.
- Check port 3000 is not in use.
- Verify all Supabase env vars are present and correct.

**Profile image / file upload fails**

- `SUPABASE_URL` must be `https://<ref>.supabase.co`, not a Postgres URI.
- Confirm the bucket name in `SUPABASE_STORAGE_BUCKET` matches what exists in Supabase.

**Frontend can't reach the backend**

- Make sure the backend is running.
- Check `CLIENT_URL` in `server/.env` includes the origin your frontend is served from (comma-separated list supported, e.g. `http://localhost:4200,http://localhost`).
- Check CORS configuration in `server/src/app.ts`.

**`npm install` fails**

- Clear the npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json` at the root and in both `client/` and `server/`, then reinstall.
