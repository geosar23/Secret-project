---
name: ui-conventions
description: Rules for building or changing any UI in the Angular client (templates, SCSS, new components, redesigns). Use whenever you touch an .html/.scss file or add a screen, dialog, form, table or layout under client/.
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

## Also

- Mockups in `designs/` are a visual reference, not code to copy: rebuild them with the priority order above instead of porting their CSS.
- Avoid `::ng-deep` unless unavoidable (Material overlays, `mat-row` state). Note that `users.component.scss` already has a global `::ng-deep mat-chip` rule that forces white chip text, so do not use `mat-chip` on a light background; use `.badge` instead.
- Keep accessibility: `aria-label` on icon-only buttons and checkboxes, real `<button>`s for actions.
- After UI changes, run `npm run lint` and `npm run build` in `client/` and look at the page in the browser if you can.
