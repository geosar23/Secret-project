# HR Platform

The visual language of the HR platform's Angular client: a rose-and-red brand on a pale pink ground, built on Angular Material 21 with a thin layer of custom tokens and utility classes. This system documents what exists in `client/src/styles.scss` so new screens (requests, leaves, balances, settings) look like the rest of the app.

## Content fundamentals

- Plain, direct labels that say what happens: "Approve", "Reject", "Cancel request", "Request leave".
- **Dates are always DD/MM/YYYY**, everywhere, including sample data and previews.
- Sentence case for buttons, headings and labels. No emoji. Material Icons for icons.
- Errors say what is wrong and how to fix it: "Not enough balance: 3 days left, 5 requested."
- Numbers that line up use tabular figures.

## Visual foundations

- **Brand**: rose (`color-primary-500`) with red (`color-accent-500`) as the secondary hue. The page ground is the translucent rose wash `color-primary-25`; surfaces are `color-bg-primary`.
- **Type**: Roboto only, 400/500/600/700. Default UI size is 14px (`text-sm`); badges and hints 12px.
- **Primary action** is a 135° gradient from `color-primary-500` to `color-primary-700`. Secondary actions are bordered, ghost actions are text-only rose.
- **Status** colour is separate from brand: success green, warning orange, error red, info blue, each with a `-light` tint for the badge background. Neutral/gray covers "canceled" and "draft".
- **Surfaces**: cards use `radius-lg` (12px), a 1px `color-border` and `shadow-sm`. Buttons and inputs use `radius-md`. Badges and icon buttons are fully round.
- **Spacing** follows the `spacing-*` scale; page padding is 24px, 16px under 768px. Page content is capped at 1400px.
- **Theme**: light only. There is no dark theme yet.

## Rules for building screens

1. Use Angular Material components first (`mat-table`, `mat-form-field`, `mat-dialog`, `mat-menu`, `mat-paginator`), restyled through `--mat-*` variables.
2. Then the global classes: `.btn` + `-primary|-secondary|-ghost|-danger|-sm`, `.card`, `.badge` + `-success|-warning|-error|-info|-gray`, `.empty-state`, `.loading-container`.
3. Then tokens only. Never hard-code a colour, spacing or radius that has a token.
4. Never use `mat-chip` on a light background (the app forces white chip text); use `.badge`.
5. Icon-only buttons need an `aria-label`.

## Request status mapping

| Status        | Badge class     |
| ------------- | --------------- |
| Pending       | `badge-warning` |
| Approved      | `badge-success` |
| Rejected      | `badge-error`   |
| Canceled      | `badge-gray`    |
| Needs routing | `badge-info`    |

## Components

Button, Badge, Card, EmptyState, LoadingState, FormField, DataTable, PageHeader, SidebarNav and Toast come from the existing stylesheet and shared components. BalanceCard is a proposed pattern for the leaves screens, built only from existing tokens.

## Keeping it in sync

Tokens are generated from the `:root` variables in `client/src/styles.scss` by `design-system/build.mjs`. Guidelines and previews are hand-written in `design-system/src`. `npm run ds:check` fails when the stylesheet has drifted since the last published sync.

## Not synced

No component bundle: the live components are Angular and Material, so previews are static HTML renditions. Fonts are hosted by Google Fonts, so no font files are included. Material's own `--mat-*` variables, the spacing and flex utility classes and the transition tokens are not tokenised here.
