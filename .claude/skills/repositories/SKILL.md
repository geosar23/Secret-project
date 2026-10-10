---
name: repositories
description: >
    Domain knowledge for server database access. USE WHEN: writing or changing any server code that
    reads or writes MongoDB (services, controllers, middleware, policies, scripts used by the app),
    adding a model or collection, adding a query, counting/checking existence, seeding data, or
    anything involving tenant (company) isolation. Covers: repositories, the companyModel factory,
    role scoping, the unscoped company/identity repositories, and the lint rule that forbids importing
    models outside repositories.
---

# Database Access via Repositories

## The rule

**Every database query goes through a repository in `server/src/repositories/`.**
Services, controllers, middleware, policies, routes and utils **never import a Mongoose model** and never call
`SomeModel.find/findOne/create/countDocuments/exists/...`.

ESLint enforces this (`no-restricted-imports` on `**/models/*` in `server/src/{services,controllers,middleware,policies,routes,utils}`).
Models may only be imported by repositories, other models, tests and one-off maintenance scripts in `server/src/scripts/`.

Why: repositories wrap the model with company isolation, so a forgotten `{ company }` filter cannot leak data across tenants.

## Key Files

| Purpose                           | File                                                  |
| --------------------------------- | ----------------------------------------------------- |
| Company-scoping factory           | `server/src/models/company.model.ts` (`companyModel`) |
| Scoped repositories               | `server/src/repositories/<entity>.repository.ts`      |
| Roles (company OR system scope)   | `server/src/repositories/role.repository.ts`          |
| Tenant root (unscoped, by design) | `server/src/repositories/company.repository.ts`       |
| Identity lookups (unscoped)       | `userIdentityRepository` in `user.repository.ts`      |
| Lint rule                         | `eslint.config.js`                                    |

## Using a repository

A scoped repository is created per request with the actor's company id and injects `company` into every operation:

```ts
const repo = userRepository(companyId); // throws if companyId is empty
await repo.find({ isActive: true }).populate("role").lean();
await repo.findById(id);
await repo.findOne({ email });
await repo.create(data); // company is set for you
await repo.insertMany(items); // company is set on every item
await repo.updateOne({ _id: id }, patch);
await repo.deleteOne({ _id: id });
await repo.count({ isActive: true });
```

- Always take `companyId` from the verified token (`req.decoded.companyId`), never from the request body.
- Reads return Mongoose queries, so keep chaining `.populate()`, `.sort()`, `.select()`, `.lean()`.
- Filters on ObjectId fields accept string ids; cast with `as FilterQuery<IEntity>` when TypeScript objects.

## Adding a query that does not exist yet

1. Check whether `companyModel` already offers it (`find`, `findOne`, `findById`, `create`, `insertMany`, `updateOne`, `deleteOne`, `count`).
2. If not, add the method to `companyModel` so **every** repository gets it, always applying `withCompany(...)`.
3. Never work around a missing method by importing the model in a service.

## Adding a new entity

1. Model in `server/src/models/<entity>.model.ts` with a required `company` field.
2. Repository `server/src/repositories/<entity>.repository.ts`:

```ts
import { companyModel } from "../models/company.model";
import { EntityModel } from "../models/entity.model";

export function entityRepository(companyId: string) {
    return companyModel(EntityModel, companyId);
}
```

3. Service calls only `entityRepository(companyId)`.
4. Add a test that a user from another company cannot read or change the record (see `company-isolation.test.ts`, `repository-contract.test.ts`).

## Intentional exceptions (keep them minimal)

| Repository                  | Why it is not company-scoped                             | Allowed use                          |
| --------------------------- | -------------------------------------------------------- | ------------------------------------ |
| `companyRepository()`       | Companies are the tenant root                            | Lookup the actor's own company, seed |
| `userIdentityRepository()`  | Login resolves the company from a globally unique email  | `findByEmail`, `emailExists` only    |
| `roleRepository(companyId)` | Returns the company's roles plus roles without a company | Always pass `companyId`              |

Do not add more unscoped methods without a strong reason. If a controller needs a cross-tenant query, that is a design problem to raise, not to solve with a model import.

## Seeding and scripts

- Application code that seeds (for example `seed.service.ts`) uses repositories like everything else.
- Files in `server/src/scripts/` are operator tools that may span tenants and may use models directly.
  Do not import script code from the app.

## Checklist before finishing a change

- [ ] No `import ... from "../models/..."` outside repositories, models, tests, scripts.
- [ ] Every repository call receives the company id from the token.
- [ ] New query helpers live in `companyModel` or a repository, not in a service.
- [ ] An isolation test covers new company-scoped data.
- [ ] `npx eslint "server/src/**/*.ts"` reports no restricted-import errors.
