# My HR SAAS

This repository contains a full-stack HR SaaS application: an Angular client (frontend) and a Node + Express + TypeScript backend (server). The project is organized so backend TypeScript sources live under `server/src` and are compiled to `server/dist`.

**Quick summary**

- **Frontend**: Angular app (in `client/` or the `raw code/` folder if your client is stored there).
- **Backend**: Node.js + Express + TypeScript (server code under `server/src`).

**Prerequisites**

- **Node.js** >= 16 and **npm** (or Yarn)
- **TypeScript** (installed via project `devDependencies`)
- **MongoDB** (for local development) or a connection string to a hosted MongoDB instance
- (Optional) **Angular CLI** for working on the client: `npm install -g @angular/cli`

**Repository layout (important paths)**

- `server/` : backend project (TypeScript). Important files: `server/package.json`, `server/tsconfig.json`, `server/src/`.
- `server/.env.example` : example environment variables — copy to `server/.env` and fill values.
- `client/` : frontend Angular application (if your Angular app lives under a different folder such as `raw code/client/`, use that path instead).

**Environment**

1. Copy the example env for the server and edit values:

```bash
cp server/.env.example server/.env
# Open server/.env and replace placeholder values (MONGO_URI, JWT_SECRET, etc.)
```

Recommended `.env` keys (already present in `server/.env.example`):

- `PORT` — server port (e.g. `3000`)
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — JWT signing secret
- `CDN_URL`, `APP_SECRET`, etc. — other optional keys used by legacy scripts

Security note: Do NOT commit `server/.env`. The repository contains `server/.env.example` with placeholders.

**Run the backend (development)**

```bash
cd server
npm install
# start with ts-node (dev):
npm run dev
```

This runs the TypeScript source directly using `ts-node` as configured in `server/package.json`.

**Build and run the backend (production)**

```bash
cd server
npm install
npm run build   # compiles TypeScript into dist/
npm start       # runs node dist/server.js
```

**Run the frontend (development)**

```bash
cd client
npm install
npm start       # or `ng serve` if you have angular-cli installed
```

If your Angular app is under `raw code/client/`, substitute that path for `client` above.

**Common commands**

- `npm run dev` (in `server/`): run server with `ts-node` for fast iteration
- `npm run build` (in `server/`): compile TypeScript to `dist/`
- `npm start` (in `server/`): run compiled server

**Git / GitHub notes**

- This repo includes a `.gitignore` configured to exclude `node_modules`, `dist/`, and `.env` files.
- If you see `Permission denied (publickey)` when pushing, either configure SSH keys or switch remote to HTTPS (see GitHub docs).

**Troubleshooting**

- If `npm run dev` fails, check `server/.env` values and ensure MongoDB is reachable.
- If routes are 404, ensure the server mounts `api` router (`/api`) — `server/src/app.ts` composes routers from `src/api` and `src/modules`.

**Contributing**

**License**
