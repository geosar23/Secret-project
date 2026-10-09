Buttons trigger actions; one primary per view.

Use `.btn` with a variant: `btn-primary` (gradient rose, the main action), `btn-secondary` (bordered), `btn-ghost` (text only), `btn-danger` (reject, delete). `btn-sm` for table rows and drawers, `btn-icon` for round icon-only buttons (add `aria-label`). Disabled buttons drop to 50% opacity.

**Page-header primary action** (e.g. "Create user", "Request leave") is the Angular Material filled button (`mat-flat-button`), not the gradient `btn-primary`: solid rose, fully rounded pill, 40px high, 14px/500 label, a leading 18px Material icon (`add`) and the label in sentence case. In static mocks use `btn-filled` (solid `color-primary-600`, `radius-full`, hover `color-primary-700`). Use the gradient `btn-primary` only for in-content and row actions such as "Approve".

Pair "Approve" (primary) with "Reject" (danger); put "Cancel request" as secondary. Keyboard focus shows a 2px `color-primary-300` outline.
