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

1. Create a feature folder under `client/src/app/features/<feature-name>/`. Services go in `client/src/app/core/services/`, server shapes in `core/interfaces/`, pure helpers in `core/utils/`, and UI shared by several features in `shared/components/` (see `.claude/skills/client-structure/SKILL.md`).
2. Register routes in `client/src/app/app.routes.ts` (lazy-load the feature module).
3. Add navigation links where appropriate.
4. Mirror any new permission keys in the client enums.
5. Add unit tests for components with non-trivial logic.
6. Build UI from the [design system](../design-system/README.md): Material components first, then the global classes and tokens in `client/src/styles.scss`. If you change `styles.scss` tokens or component rules, run `npm run ds:check` and follow the [design system README](../design-system/README.md#changing-the-design-system).

### Skill file (required)

Every new feature must ship with a **Copilot skill file** so the AI assistant has accurate domain knowledge when working on that feature in the future.

Create `.github/skills/<feature-name>/SKILL.md` with this structure:

```markdown
---
name: <feature-name>
description: >
    Domain knowledge for the <Feature> feature. USE WHEN: <comma-separated list of
    situations where this skill should be loaded — editing dialogs, services, models,
    routes, permission guards, etc.>. Covers: <key files and concepts>.
---

# <Feature> Feature

## Key Files

| Layer             | File                                                    |
| ----------------- | ------------------------------------------------------- |
| Server model      | `server/src/models/<feature>.model.ts`                  |
| Server interface  | `server/src/interfaces/<feature>.interface.ts`          |
| Server repository | `server/src/repositories/<feature>.repository.ts`       |
| Server service    | `server/src/services/<feature>.service.ts`              |
| Server controller | `server/src/controllers/<feature>.controller.ts`        |
| Server routes     | `server/src/routes/<feature>.routes.ts`                 |
| Client feature    | `client/src/app/features/<feature>/`                    |
| Client service    | `client/src/app/core/services/<feature>.service.ts`     |
| Client interface  | `client/src/app/core/interfaces/<feature>.interface.ts` |

---

## Data Model

<!-- Paste the TypeScript interface for both server IModel and client IModel -->

---

## Key Behaviours / Rules

<!-- Business rules, constraints, permission requirements, edge cases -->

---

## API Endpoints

<!-- List the routes this feature exposes -->
```

**Tips for a good skill:**

- The `description` field is what Copilot reads to decide whether to load the skill. Make the `USE WHEN:` list specific and exhaustive — include component names, file names, and action verbs (editing, adding, debugging).
- Keep the body accurate: file paths must be real, interfaces must match the actual code.
- Update the skill whenever the feature's model, files, or rules change significantly.

**Existing skills for reference:**

- `.github/skills/permissions/SKILL.md`
- `.github/skills/roles/SKILL.md`

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
