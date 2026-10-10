Form fields use Angular Material's `mat-form-field` first; the global `.form-group` and `.form-control` classes cover plain inputs.

Prefer `mat-form-field` with `appearance="outline"` and `subscriptSizing="dynamic"`. For plain inputs, wrap label and `.form-control` in `.form-group` (24px bottom margin). Focus shows a rose border and a 3px `color-primary-50` ring. Hints use `.form-hint`, errors use `.form-error` and the `error` class on the control. Disabled controls fill with `color-gray-100`. Dates display and parse as DD/MM/YYYY.
