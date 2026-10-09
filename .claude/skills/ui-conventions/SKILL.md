---
name: ui-conventions
description: Rules for designing or building any UI in the Angular client (templates, SCSS, new components, redesigns), including whether something should be a modal, a drawer or a page. Use whenever you touch an .html/.scss file, add a screen, dialog, form, table or layout under client/, or plan or prompt a new screen.
---

# UI conventions

Always pick the first option that works, and only fall through when it genuinely cannot do the job.

## Priority order

1. **Angular Material components and their classes/tokens.** `mat-form-field`, `mat-select`, `mat-checkbox`, `mat-table`, `mat-paginator`, `mat-dialog`, `mat-menu`, `mat-progress-bar`, `mat-button` variants, `mat-icon`, etc. Restyle through Material's own tokens (`--mat-*` CSS variables) or component inputs (`appearance`, `subscriptSizing`, `color`), not by overriding internals.
2. **What already exists in the repo.** Look before writing:
    - Global classes in `client/src/styles.scss`: `.btn`, `.btn-primary|secondary|ghost|sm`, `.card` (+ `.card-body`), `.badge` (+ `-success|-warning|-error|-info|-gray`), `.empty-state`, `.loading-container`, `.form-hint`, spacing/flex/text utilities (`.mt-md`, `.gap-sm`, `.d-flex`, `.flex-wrap`, `.ml-auto`, `.text-secondary`, ...), `.slide-up`/`.fade-in`.
    - Design tokens: `--color-*`, `--spacing-*`, `--radius-*`, `--font-size-*`, `--font-weight-*`, `--shadow-*`, `--transition-*`, `--z-*`. Never hard-code colours, px spacing or radii when a token exists.
    - Shared components in `client/src/app/shared/components/` and shared SCSS partials (e.g. `features/users/user-form/_user-form-wizard.scss`).
    - Helpers in `core/utils` (e.g. `user-form-options.ts`) for option lists.
3. **Custom SCSS, last.** Only for what 1 and 2 cannot express (e.g. a sticky floating bar, a selected-row tint). Keep it small, scoped to the component, built only from the tokens above, and responsive (mobile at 600px/768px). If the same custom style is needed in a second place, promote it to `styles.scss` or a shared partial instead of copying it.

## Modal, drawer or page?

Decide this before designing or building a screen, and again when a form grows. These are the common rules from Material, Carbon, Atlassian, Polaris and Nielsen Norman Group.

**Modal (`MatDialog`)** when the task is short and the user keeps the page underneath as context:

- a few fields and one clear outcome (confirm, quick create, pick something, a small form with a live preview);
- Save and Cancel with nothing in between, and nothing the user would want to link to.

**Page (a route)** when any of these is true:

- the content is long, scrolls, or has several steps or sections;
- people will want a URL: to share it, bookmark it, open it from an email or notification, or reload and keep their place;
- the user may need to look something up elsewhere while working (a modal blocks the page);
- the form is complex or has state that is painful to lose;
- it would open another dialog on top. Never nest modals.

**Drawer or split panel (a list with a detail pane, kept in the URL as a route or query param)** for master-detail: inboxes, request review, anything where the user scans a list and opens items one after another. The list stays visible and the selection is linkable.

**Inline** for a one-field confirmation inside an existing panel (for example the reason when rejecting or canceling a request).

Anti-patterns to avoid:

- large or multi-step forms in a modal;
- a modal for content people will want to link to;
- closing a modal on an outside click when the user has typed something (set `disableClose` while the form is dirty or submitting);
- using a modal for something that is neither urgent nor a decision.

When a modal form keeps growing (conditional sections, many optional fields), that is the signal to move it to a page.

Current examples: Request leave and the country and department forms are modals; create user and edit user are pages; the Requests list with its detail panel is a split view at `/requests?id=...`; leave settings will be pages.

## Buttons that load

Any button that triggers async work and shows progress (a spinner, a changed label, a disabled state while it runs: save, create, submit, approve) **must use `<app-loading-button>`** from `client/src/app/shared/components/loading-button/`. Never hand-roll a `mat-spinner` inside a `<button>`, and never toggle the label with `@if` in the template.

```html
<app-loading-button
    label="Submit request"
    loadingLabel="Submitting..."
    [loading]="submitting()"
    [disabled]="!canSubmit()"
    [minWidth]="'150px'"
    (buttonClick)="submit()"
></app-loading-button>
```

- Inputs: `label`, `loadingLabel`, `loading`, `disabled`, `color` (`primary|accent|warn`), `type` (`button|submit`), `minWidth`. Output: `buttonClick`.
- The component already disables itself while `loading` is true, so `[disabled]` only needs the validity condition.
- Import `LoadingButtonComponent` in the standalone component. Examples: `department-dialog`, `create-user`, `request-leave-dialog`.
- Plain buttons that do not load (Cancel, Back, Close, navigation) stay `mat-button` or `.btn`.
- If the component cannot express a case (for example a danger-styled button), extend `LoadingButtonComponent` with a new input instead of copying its markup.

## Also

- Where files go (services in `core/services/`, shared UI in `shared/components/`, and so on) is covered by the `client-structure` skill. Check `shared/components/` for a fitting component before building new UI.
- Mockups in `designs/` are a visual reference, not code to copy: rebuild them with the priority order above instead of porting their CSS.
- Avoid `::ng-deep` unless unavoidable (Material overlays, `mat-row` state). Note that `users.component.scss` already has a global `::ng-deep mat-chip` rule that forces white chip text, so do not use `mat-chip` on a light background; use `.badge` instead.
- Keep accessibility: `aria-label` on icon-only buttons and checkboxes, real `<button>`s for actions.
- After UI changes, run `npm run lint` and `npm run build` in `client/` and look at the page in the browser if you can.
