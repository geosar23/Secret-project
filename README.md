# HR SaaS Application

A multi-tenant HR management system — Angular 21 frontend + Node.js/Express backend + MongoDB + Supabase Storage.

## Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Frontend     | Angular 21, Angular Material        |
| Backend      | Node.js, Express, TypeScript        |
| Database     | MongoDB (Mongoose)                  |
| File Storage | Supabase Storage                    |
| Auth         | JWT + bcryptjs                      |
| Tooling      | Prettier, ESLint, Husky, Commitlint |

## Quick Start

```bash
# 1. Install all dependencies (root, client, server)
npm install

# 2. Create server/.env — see docs/getting-started.md for required variables

# 3. Run both apps
npm run dev
# Backend: http://localhost:3000
# Frontend: http://localhost:4200
```

## Docker

```bash
# Build and run the full stack with Docker
docker compose build
docker compose up
# Backend: http://localhost:3000
# Frontend: http://localhost
```

See [Getting Started](./docs/getting-started.md#5-running-with-docker) for PaaS deployment instructions.

## Documentation

All detailed documentation lives in [`docs/`](./docs/index.md).

| If you want to…                       | Read                                                        |
| ------------------------------------- | ----------------------------------------------------------- |
| Set up the project locally            | [Getting Started](./docs/getting-started.md)                |
| Understand how the system is designed | [Architecture](./docs/architecture.md)                      |
| Learn about authentication            | [Auth](./docs/features/auth.md)                             |
| Understand RBAC and permissions       | [Permissions & Roles](./docs/features/permissions-roles.md) |
| See all HR entity types               | [HR Entities](./docs/features/hr-entities.md)               |
| Understand file upload / storage      | [File Storage](./docs/features/file-storage.md)             |
| Browse all REST endpoints             | [API Reference](./docs/api-reference.md)                    |
| Run or write tests                    | [Testing](./docs/testing.md)                                |
| Build UI with the design system       | [Design System](./design-system/README.md)                  |
| Contribute code                       | [Contributing](./docs/contributing.md)                      |
| See what changed                      | [Changelog](./docs/changelog.md)                            |
| See what's planned                    | [Roadmap](./docs/roadmap.md)                                |
