import { Resend } from "resend";
import { maskEmail } from "./email.mask";
import { EmailMessage, EmailTransport, EmailTransportError } from "./email.types";

/** Logs a redacted summary instead of sending. Message bodies (which may hold links) are printed only when `logBody` is set. */
export class ConsoleTransport implements EmailTransport {
    readonly name = "console";

    constructor(private readonly logBody = false) {}

    async send(message: EmailMessage): Promise<void> {
        console.info(`[email:console] To: ${maskEmail(message.to)} | Subject: ${message.subject}`);
        if (this.logBody) {
            console.info(`[email:console] (dev only)\n${message.text}`);
        }
    }
}

/** Resend error names that mean "retrying will not help" even though the status is 429. */
const NON_RETRYABLE_RATE_LIMITS = new Set(["daily_quota_exceeded", "monthly_quota_exceeded"]);

/** Decides whether an error returned by Resend is worth retrying. */
export function isRetryableResendError(error: { name?: string; statusCode: number | null }): boolean {
    const { statusCode, name } = error;
    if (statusCode === null || statusCode === undefined) {
        return true; // network failure inside the SDK (reported as application_error without a status)
    }
    if (statusCode === 429) {
        return !NON_RETRYABLE_RATE_LIMITS.has(name ?? "");
    }
    // 409 concurrent_idempotent_requests: the first attempt is still in flight, so retrying is safe.
    return statusCode === 408 || statusCode === 409 || statusCode >= 500;
}

export class ResendTransport implements EmailTransport {
    readonly name = "resend";
    private readonly client: Resend;

    constructor(apiKey: string, client?: Pick<Resend, "emails">) {
        this.client = (client ?? new Resend(apiKey)) as Resend;
    }

    async send(message: EmailMessage): Promise<void> {
        let result;
        try {
            result = await this.client.emails.send(
                {
                    from: message.from,
                    to: [message.to],
                    subject: message.subject,
                    html: message.html,
                    text: message.text,
                    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
                },
                message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined,
            );
        } catch {
            // The SDK normally returns { error }, but guard against throws. The cause is not propagated (may embed request details).
            throw new EmailTransportError("Resend request failed (network/timeout)", true);
        }

        // The SDK does not throw on API errors: they come back as { data: null, error }.
        if (result.error) {
            const { name, statusCode } = result.error;
            throw new EmailTransportError(
                `Resend error ${name}${statusCode ? ` (HTTP ${statusCode})` : ""}`,
                isRetryableResendError(result.error),
                statusCode ?? undefined,
            );
        }
    }
}
