---
name: repositories
description: Rules for server data access. Use whenever you create or edit a model, repository, service or controller under server/src, write any code that reads or writes MongoDB, or add a new collection. Services and controllers never import a Mongoose model; they go through a company-scoped repository.
---

# Server data access: repositories only

**Never use a Mongoose model directly in a service, controller, middleware, policy or util.** All database access goes through a repository from `server/src/repositories/`. A repository is a thin wrapper (`companyModel`) that injects `company: <companyId>` into every query, which is how tenant isolation is enforced. A direct `UserModel.find(...)` can leak another company's data.

Models are imported only by:

- `server/src/repositories/*.repository.ts`
- seed or migration scripts in `server/src/scripts/`
- tests (to seed data)

## Layer responsibilities

| Layer      | Does                                                      | Never                                |
| ---------- | --------------------------------------------------------- | ------------------------------------ |
| Controller | Parse request, call a service, shape the response         | Business logic, models, repositories |
| Service    | Business logic; gets repositories with `req.user` company | Import a `*Model`                    |
| Repository | `companyModel(Model, companyId)`; all queries             | Business logic                       |
| Model      | Schema, indexes                                           | Be used outside repositories         |

## Adding a new collection

1. Model in `server/src/models/<name>.model.ts`. It **must** have a required `company` field (ObjectId ref to Companies) and an index starting with `company`.
2. Interface in `server/src/interfaces/<name>.interface.ts`.
3. Repository in `server/src/repositories/<name>.repository.ts`, exactly this shape:

```ts
import { companyModel } from "../models/company.model";
import { DepartmentModel } from "../models/department.model";

export function departmentRepository(companyId: string) {
    return companyModel(DepartmentModel, companyId);
}
```

4. Service calls it with the company from the authenticated user:

```ts
const departments = await departmentRepository(companyId).find({ isActive: true });
```

5. Add an isolation test (see `__tests__/company-isolation.test.ts` and `__tests__/repository-contract.test.ts`): data seeded in company A must be invisible to company B, and the factory must throw without a `companyId`.

## What the wrapper offers

`find`, `findOne`, `findById`, `create`, `insertMany`, `updateOne`, `findOneAndUpdate` (atomic, returns the new doc, `null` if the guard no longer matches), `updateMany`, `deleteOne`, `count`. All inject `company`.

## Gotchas

- **Need a query the wrapper lacks** (aggregate, `exists`, bulk ops, transactions)? Add the method to `companyModel` in `server/src/models/company.model.ts`, or a named method on that repository, and make sure it adds the `company` scope (for aggregate, a leading `$match: { company }`). Do not bypass the repository from the service.
- **`updateOne` bypasses Mongoose document hooks.** Side effects (org-change effects, audit) must be called from the service layer, not model hooks.
- **Populate** stays on the returned query (`.populate(...)`), but populated models belong to the same company; do not populate across tenants.
- **Documents from the body are not trusted**: never pass `company` from request input; the wrapper overrides it on create, but do not rely on that for filters you build yourself.
- **Intentional exceptions** are rare and must be explicit, named, commented and kept in the repository file. Example: `userIdentityRepository()` in `user.repository.ts` looks users up by globally unique email at login, before a company is known. Do not add new unscoped repositories without asking.
- Never accept `companyId` from the request. Take it from `req.user` (the verified token).

## Quick self-check before finishing

- `grep -rn "models/" server/src/services server/src/controllers` returns nothing.
- Every new repository is `companyModel(...)` or has a documented reason not to be.
- A new isolation test exists for any new collection.
