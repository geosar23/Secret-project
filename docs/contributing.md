# Contributing

## Code Style

All code is formatted with **Prettier** and linted with **ESLint**.

Run before every commit:

```bash
npm run format   # From repo root — formats client + server
npm run lint     # From repo root — lints client + server
```

These are also enforced by a Husky pre-commit hook.

---

## Commit Messages

Commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) format, enforced by **Commitlint**:

```
<type>(<scope>): <short description>

feat(users): add manager assignment to edit form
fix(auth): remove hardcoded JWT fallback
docs(readme): add quick-start instructions
chore(ci): add headless test step for client
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`.

---

## Branch Strategy

- Work on a feature branch branched from `main`.
- Name branches descriptively: `feat/leaves-module`, `fix/profile-image-url`.
- Open a pull request against `main`.
- CI must pass before merging.

---

## Adding a New Feature

### Backend checklist

1. Define the Mongoose schema in `server/src/models/`.
2. Define TypeScript interfaces in `server/src/interfaces/`.
3. Create a repository in `server/src/repositories/` — always filter by `companyId`.
4. Create a service in `server/src/services/`.
5. Create a controller in `server/src/controllers/`.
6. Register routes in `server/src/routes/` and mount them in `server/src/routes.ts`.
7. Add any new permission keys to `server/src/enums/permissions.enum.ts` **and** the client mirror.
8. Write integration tests in `server/src/__tests__/`.

### Frontend checklist

1. Create a feature folder under `client/src/app/features/<feature-name>/`.
2. Register routes in `client/src/app/app.routes.ts` (lazy-load the feature module).
3. Add navigation links where appropriate.
4. Mirror any new permission keys in the client enums.
5. Add unit tests for components with non-trivial logic.

---

## Adding a New Permission

1. Add the key to `server/src/enums/permissions.enum.ts`.
2. Add the same key to the client-side permissions enum.
3. Apply `requirePermission('new:key')` middleware on the relevant route(s).
4. Use the `PermissionService`/`PermissionChecker` in the Angular component to guard UI elements.

---

## Environment Variables

Never commit `.env` files. Add any new required variables to:

- `.env.example` (if one exists) or document them in [Getting Started](./getting-started.md).
- `server/src/config/env.ts` — the validation/fail-fast logic.

---

## Testing

- Run backend tests before opening a PR: `cd server && npm test`.
- Ensure CI passes (lint + test + build for both apps).
- New API endpoints should have at least one integration test covering the happy path and a 401/403 case.
