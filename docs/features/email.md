# Email

Transactional email foundation (P0-23) for security notices, invitations, password reset and later notifications.
Code: `server/src/services/email/`.

## Provider

Resend through its official SDK (`resend`). Providers sit behind the `EmailTransport` interface
(`email.types.ts`: `send({ from, to, subject, html, text, replyTo?, idempotencyKey? })`); switching to SMTP, Brevo or SES
means adding one transport class in `email.transports.ts` and a value for `EMAIL_PROVIDER`.

| `EMAIL_PROVIDER` | Use                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `console`        | Default in development and test. Logs recipient and subject. The body is printed only when `NODE_ENV=development`. |
| `resend`         | Required in production                                                                                             |

The Resend SDK returns `{ data, error }` instead of throwing on API errors; `ResendTransport` converts `error` into an
`EmailTransportError` carrying `retryable` and the HTTP status.

## Configuration

`EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY`, `EMAIL_REPLY_TO` (see `getting-started.md`).
The server exits at boot (`validateEnv`) when `EMAIL_PROVIDER=resend` and the key or sender is missing or malformed,
when the provider is unknown, and when `NODE_ENV=production` with `EMAIL_PROVIDER=console`. Jest sets `console`.

Send a test email with the configured provider (from `server/`):

```bash
npm run email:test -- you@example.com
```

## Usage

```ts
await EmailService.send(
    "password-reset-notice",
    user.email,
    { recipientName: user.name, resetAt: new Date(), temporaryPassword },
    { company: brandingFromCompany(user.company), companyId: String(user.company._id), requestId },
);
```

`send` never throws; it returns `{ ok, attempts }`. For a request path, do not `await` it (see
`notifyPasswordResetByAdmin` in `email.notifications.ts`, which is fire-and-forget and skips silently when the user has
no populated company). Use the user's **own** company for the branding so no email carries another tenant's data.
Callers must not put tokens in logs, and should return the same response regardless of the result (no account enumeration).

## Templates

Plain TS functions in `email.templates.ts`, rendered to `{ subject, html, text }` with company branding (name, plus
optional `logoUrl` and `primaryColor`; the Company model only stores a private storage logo today, so only the name is
used). Every interpolated value is HTML-escaped, links must be http(s), subjects and names lose line breaks, dates print as
`DD/MM/YYYY HH:mm UTC`.

| Template                | Data                                            | Purpose                                                                  |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| `test-email`            | none                                            | Smoke test                                                               |
| `password-reset-notice` | `recipientName`, `resetAt`, `temporaryPassword` | Admin reset the user's password; carries the temporary password, no link |
| `invitation`            | name, inviter?, `activationLink`, hours         | P0-24                                                                    |
| `password-reset`        | name, `resetLink`, minutes                      | P0-25                                                                    |

To add one: add its data type to `EmailTemplateDataMap` (`email.types.ts`), add a renderer to `renderers` in
`email.templates.ts` using `layout(...)`, and add a test (rendering, escaping, no secret in logs).

## Retry and limits

3 attempts per email, 500 ms then 1 s backoff. Network errors, timeouts, 408, 409 (idempotent request in flight), 429 and
5xx are retried; other 4xx (validation, auth, daily/monthly quota) are not. One idempotency key per logical email is reused
on every attempt (override with `context.idempotencyKey`). Retries are in-process: a restart during backoff loses the
email, and there is no outbox or queue. Flows that must not silently lose mail need a "resend" action (P0-24).

## Logging

JSON lines with template, provider, outcome, attempt, status, companyId, requestId (the `x-request-id` header when
present) and the recipient address. Never the body, tokens, links or API key.

## Setup outside the code

Create a Resend account (EU region if available), verify a sending domain, preferably a subdomain such as
`mail.<domain>`, with SPF and DKIM, add a DMARC record, create an API key restricted to sending, sign the DPA, and set
`EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY` in production. Check the current free-tier limits (about 3,000 emails
per month and 100 per day at the time of writing).
