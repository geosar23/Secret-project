# Email

Transactional email foundation (P0-23) for invitations, password reset and later notifications.
Code: `server/src/services/email/`.

## Provider

Resend over its HTTPS API (no extra dependency, EU region, idempotent sends). Providers sit behind the
`EmailTransport` interface (`email.types.ts`); switching means adding one transport class and a value for
`EMAIL_TRANSPORT`.

| Transport | Use                                                                                         |
| --------- | ------------------------------------------------------------------------------------------- |
| `console` | Default in development and test. Logs recipient and subject; the body only in `development` |
| `resend`  | Required in production                                                                      |

Setup outside the code: create a Resend account, verify the sending domain (SPF, DKIM, add DMARC), create an API key, choose the sender address.

## Configuration

`EMAIL_TRANSPORT`, `EMAIL_FROM`, `RESEND_API_KEY`, `EMAIL_REPLY_TO` (see `getting-started.md`).
In production the server exits at boot if the transport is `console`, the sender is invalid or the API key is missing.

## Usage

```ts
const company = await CompanyRepository.findById(user.company);
await EmailService.send(
    "invitation",
    user.email,
    { recipientName: user.firstName, activationLink, expiresInHours: 48 },
    { company: brandingFromCompany(company), companyId: String(company._id), requestId },
);
```

`send` never throws; it returns `{ ok, attempts }`. Callers must not put the token in logs, and should
return the same response regardless of the result (no account enumeration for password reset).

Templates are plain TS functions (`email.templates.ts`); every value is HTML-escaped, links must be http(s),
subjects and names are stripped of line breaks.

## Retry and limits

3 attempts, 500 ms then 1 s backoff. Network errors, timeouts, 408, 429 and 5xx are retried; other 4xx are not.
The idempotency key is reused across attempts. Retries are in-process: a restart during backoff loses the email,
and there is no outbox or queue. Admins need a "resend invitation" action (P0-24) for this reason.

## Logging

JSON lines with template, transport, companyId, requestId, attempt, status and recipient domain only.
No tokens, links, bodies or full addresses.
