# Documentation

Welcome to the HR SaaS project documentation. This index is your starting point — follow the reading order below if you are new to the codebase.

## New Here? Start in Order

1. [Getting Started](./getting-started.md) — install, configure environment variables, run the app
2. [Architecture](./architecture.md) — how the system is structured, multi-tenancy, data flow
3. [Features](./features/) — deep-dives on each major area:
    - [Authentication](./features/auth.md)
    - [Permissions & Roles](./features/permissions-roles.md)
    - [HR Entities](./features/hr-entities.md)
    - [File Storage](./features/file-storage.md)
4. [API Reference](./api-reference.md) — full REST endpoint list

## Other References

| Document                          | Description                                      |
| --------------------------------- | ------------------------------------------------ |
| [Testing](./testing.md)           | Test strategy, how to run tests, what is covered |
| [Contributing](./contributing.md) | Coding standards, commit format, PR process      |
| [Changelog](./changelog.md)       | History of significant changes                   |
| [Roadmap](./roadmap.md)           | Planned features and upcoming work               |

## Quick Links

- Backend source: `server/src/`
- Frontend source: `client/src/app/`
- Integration tests: `server/src/__tests__/`
- Copilot skills: `.github/skills/`
- Environment variables: [Getting Started → Environment Setup](./getting-started.md#environment-setup)
