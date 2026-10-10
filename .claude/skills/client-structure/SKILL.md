---
name: client-structure
description: Where files go in the Angular client (client/src/app). Use whenever you create, move or rename a component, service, interface, util, pipe, guard, resolver, dialog or route under client/, or before adding a new file there.
---

# Client folder structure

Follow the existing layout. Before creating a file, look at a sibling of the same kind and copy its location and naming. If a file does not fit the table below, ask instead of inventing a new folder.

## Where things live

| Kind                                                     | Location                                             | Naming                                                       |
| -------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| **Every injectable service** (API calls, shared state)   | `core/services/`                                     | `<name>.service.ts`, `providedIn: "root"`                    |
| API and domain shapes (what the server returns or takes) | `core/interfaces/`                                   | `<name>.interface.ts`, types prefixed `I` (`IUser`)          |
| Enums and permission keys                                | `core/enums/`                                        | `<name>.enum.ts`                                             |
| Pure functions (formatting, mapping, permission maths)   | `core/utils/`                                        | `<name>.utils.ts` or `.util.ts`, with a `.spec.ts` beside it |
| Route guards                                             | `core/guards/`                                       | `<name>.guard.ts`                                            |
| HTTP interceptors, global error handler                  | `core/interceptors/`, `core/handlers/`               | `<name>.interceptor.ts`                                      |
| Form validators                                          | `core/validators/`                                   | `<name>.validators.ts`                                       |
| Reusable UI used by two or more features                 | `shared/components/<name>/`                          | `<name>.component.ts/.html/.scss`, selector `app-<name>`     |
| Layouts, pipes, shared SCSS partials                     | `shared/layouts/`, `shared/pipes/`, `shared/styles/` | `<name>.pipe.ts`, `_<name>.scss`                             |
| A routed page and everything only it uses                | `features/<feature>/`                                | `<feature>.component.ts/.html/.scss`                         |
| A dialog owned by a feature                              | `features/<feature>/<name>-dialog/`                  | `<name>-dialog.component.*`                                  |
| A sub-page of a feature                                  | `features/<feature>/<sub-page>/`                     | `<sub-page>.component.*` (for example `users/create-user/`)  |
| Routes                                                   | `app.routes.ts`, lazy `loadComponent`                | `data: { breadcrumb: "..." }` on each route                  |

## Rules

1. **Services only in `core/services/`.** Never create a `*.service.ts` inside `features/` or `shared/`. A "dialog service", "state service" or "facade" is still a service and goes in core. If it would need to import a feature component, do not create it: open the dialog with `MatDialog` in the caller, as every existing feature does.
2. **Server shapes go in `core/interfaces/`.** Small view-only types used by one component (a card, a table row) may stay in that component file.
3. **Pure logic goes in `core/utils/`**, not in a component or a feature folder. If two features need the same helper, move it to `core/utils/` instead of importing it from the other feature or copying it.
4. **UI used in two or more features goes in `shared/components/`.** UI used by one feature stays in that feature's folder. Check `shared/components/` and the global classes in `styles.scss` before building something new (see the `ui-conventions` skill).
5. **Features own their pages, dialogs and private helpers.** Feature-private helpers, resolvers, pipes and step lists may sit in the feature folder (`profile/profile-route-context.resolver.ts`, `users/user-form/user-form-steps.ts`). A feature may open another feature's dialog, but should not import anything else from it.
6. **One component per folder** once it has more than one file, named after the component. Standalone components, `ChangeDetectionStrategy.OnPush`, signals for state.
7. **Never put HTTP calls in components.** They go through a service in `core/services/` that uses `ApiService`.
8. **Permission checks** are methods on `PermissionService`, not inline in components. Components that depend on the logged-in user must read it reactively (`CurrentUserService.user()`), because the user loads after the component is created on a hard refresh.

## Before finishing

Run these from the repo root to catch structure mistakes:

```bash
find client/src/app -name "*.service.ts" ! -path "*/core/services/*"   # must print nothing
npm run lint
npm run build -w client
```
