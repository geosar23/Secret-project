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
