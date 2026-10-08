import { EmailMessage, EmailTransport, EmailTransportError } from "./email.types";

/** Logs instead of sending. Message bodies (which hold links/tokens) are printed only when `logBody` is set. */
export class ConsoleTransport implements EmailTransport {
    readonly name = "console";

    constructor(private readonly logBody = false) {}

    async send(message: EmailMessage): Promise<void> {
        console.info(`[email:console] To: ${message.to} | Subject: ${message.subject}`);
        if (this.logBody) {
            console.info(`[email:console] (dev only)\n${message.text}`);
        }
    }
}

export class ResendTransport implements EmailTransport {
    readonly name = "resend";

    constructor(
        private readonly apiKey: string,
        private readonly timeoutMs = 10_000,
    ) {}

    async send(message: EmailMessage): Promise<void> {
        let response: Response;
        try {
            response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                    "Idempotency-Key": message.idempotencyKey,
                },
                body: JSON.stringify({
                    from: message.from,
                    to: [message.to],
                    subject: message.subject,
                    html: message.html,
                    text: message.text,
                    ...(message.replyTo ? { reply_to: message.replyTo } : {}),
                }),
                signal: AbortSignal.timeout(this.timeoutMs),
            });
        } catch {
            // Network failure or timeout: retryable. The underlying error is not propagated (may embed request details).
            throw new EmailTransportError("Resend request failed (network/timeout)", true);
        }

        if (response.ok) {
            return;
        }

        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        throw new EmailTransportError(`Resend responded with HTTP ${response.status}`, retryable, response.status);
    }
}
