# Design system

The visual language of the HR platform client: tokens, component guidelines and live previews. It is published as a Claude design system so designs and mockups reuse the same look as the app.

- **Published system:** https://claude.ai/artifact/4GpVLV3QrjnD7AX3WUymoR (private; ask the owner for access)
- **Source of truth for values:** `client/src/styles.scss` (the `:root` variables)

## Using it as a developer

### Building UI in the Angular client

Follow the order in `.claude/skills/ui-conventions/SKILL.md`:

1. Angular Material components, restyled through `--mat-*` variables.
2. Existing global classes and tokens from `client/src/styles.scss`:
    - Buttons: `.btn` with `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.btn-icon`
    - Status: `.badge` with `.badge-success`, `.badge-warning`, `.badge-error`, `.badge-info`, `.badge-gray`
    - Surfaces and states: `.card`, `.empty-state`, `.loading-container`, `.page-container`
    - Forms: `.form-group`, `.form-control`, `.form-hint`, `.form-error`
3. Custom SCSS last, built only from tokens.

Never hard-code a colour, spacing or radius when a token exists. Use `var(--color-primary-500)`, `var(--spacing-md)`, `var(--radius-lg)` and so on. The token names in the design system are exactly the CSS variable names without the leading `--`.

Dates are always DD/MM/YYYY.

### Finding the right component

Open the published system and browse the cards (Button, Badge, Card, EmptyState, LoadingState, FormField, DataTable, PageHeader, SidebarNav, Toast, BalanceCard). Each has a guideline and a preview. The same text is in `design-system/src/components/<Name>/README.md`.

### Designing a new screen with Claude

Start a Claude Design canvas from the published system, or tell Claude Code "use the design system" and point it at this folder. Designs then pick up the same tokens and components.

## Changing the design system

| You want to                                           | Do this                                                                                                                                                                                               |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Change a colour, spacing, radius, shadow or font size | Edit the variable in `client/src/styles.scss`. Tokens regenerate from it. Do not edit `generated/tokens.json` by hand.                                                                                |
| Add a usage note to a token                           | Add it to `design-system/src/usage.json`                                                                                                                                                              |
| Change the heading or text scale                      | Edit `design-system/src/type.json`                                                                                                                                                                    |
| Add or update a component card                        | Edit `design-system/src/components/<Name>/README.md` and `preview.html`. Start the preview with `<!-- @dsCard group="..." height=N -->` and put `<!-- ds:base -->` where the shared preview CSS goes. |
| Change the brand book text                            | Edit `design-system/src/README.md`                                                                                                                                                                    |

Then run:

```bash
npm run ds:build    # regenerate tokens, assemble design-system/.dist/project
npm run ds:check    # exit 1 if styles.scss drifted since the last published sync
```

`ds:check` fails for two reasons:

- **Tokens differ from `generated/tokens.json`.** Run `npm run ds:build` and commit the result.
- **Component rules in `styles.scss` changed since the last sync.** Review the previews in `design-system/src/components` against the new styles, then rebuild and republish.

## Publishing

Publishing sends `design-system/.dist/project` to the published system. Ask Claude Code to "sync the design system". It runs the build, publishes the bundle to the link above, then runs `node design-system/build.mjs --mark-synced`, which updates `sync-state.json`. Commit that file with the change.

## Files

| Path                    | Purpose                                                                | Commit          |
| ----------------------- | ---------------------------------------------------------------------- | --------------- |
| `build.mjs`             | Generates tokens and assembles the bundle                              | yes             |
| `src/`                  | Hand-written brand book, guidelines, previews, type scale, usage notes | yes             |
| `generated/tokens.json` | Generated tokens, committed so changes show in review                  | yes             |
| `sync-state.json`       | Hash of `styles.scss` at the last publish                              | yes             |
| `.dist/`                | Publish bundle, rebuilt on demand                                      | no (gitignored) |

## Limits

- Previews are static HTML copies of the styles. They do not render the real Angular components.
- Material's own `--mat-*` variables, spacing and flex utility classes, and transition tokens are not part of the token set.
- Light theme only.
