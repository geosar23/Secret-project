# Testing

## Backend

The server uses **Jest** with **ts-jest**, **Supertest**, and **mongodb-memory-server**.

Tests run against an in-memory MongoDB instance — no external database needed.

### Running tests

```bash
# From server/ (or via the workspace root)
cd server
npm test                  # Run all tests
npm run test:coverage     # Run with coverage report
```

### Test location

All tests live in `server/src/__tests__/`.

### What is covered

| File                         | Coverage                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `auth.test.ts`               | Login, `/me`, token validation, missing/invalid credentials — 7+ scenarios                                                     |
| `rbac.test.ts`               | Permission grant/revoke endpoints — 401 no auth, 403 insufficient perms, 200 with correct perms                                |
| `company-isolation.test.ts`  | Proves Company A users cannot read Company B data for users, roles, departments, countries, sub-departments, employment titles |
| `permission-factory.test.ts` | Unit tests for the `definePermissions` factory and `PermissionChecker` logic                                                   |

### Test helpers

`server/src/__tests__/helpers/` contains shared setup utilities (seeding users, companies, tokens) reused across test files.

### Environment

`server/src/__tests__/setup.env.ts` sets required environment variables for the test run so the server can boot without a real `.env` file.

---

## Frontend

The Angular app uses **Jasmine** + **Karma** (default Angular test setup).

### Running tests

```bash
cd client
npm test          # Run in watch mode
```

### What is covered

- `app.spec.ts` — root app component smoke test
- Edit-user component behaviour
- Profile edit and change-password flows
- Route guard / auth state behaviour

---

## CI

Tests are run automatically on every push and pull request via `.github/workflows/ci.yml`:

- **Server:** install → lint → build
- **Client:** install → lint → test (headless Chrome) → build

A failing CI run blocks merge when branch protection rules are configured.

---

## Philosophy

- Integration tests over unit tests for the backend — real HTTP requests against a real (in-memory) database catch more bugs.
- No mocking of the database layer in integration tests.
- Each test file is self-contained: it seeds its own data and cleans up after itself.
