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

Create a `.env` file inside `server/`:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/hrms
JWT_SECRET=your-strong-secret-key-here
NODE_ENV=development
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=hrms-saas
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
- Check CORS configuration in `server/src/app.ts`.

**`npm install` fails**

- Clear the npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json` at the root and in both `client/` and `server/`, then reinstall.
