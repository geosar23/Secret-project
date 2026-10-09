Loading states tell the user something is on its way.

Use `.loading-container` with a `mat-spinner` and a one-line message in secondary text ("Loading requests…"). Prefer it inside a card or table area, never as a full-page takeover. Replace it with an EmptyState when the load returns nothing, and with an error message plus a retry button when it fails.
