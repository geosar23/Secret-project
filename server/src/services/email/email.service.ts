import { randomUUID } from "crypto";
import { config } from "../../config/env";
import { ConsoleTransport, ResendTransport } from "./email.transports";
import { renderTemplate, toSingleLine } from "./email.templates";
import {
    EmailTemplateDataMap,
    EmailTemplateName,
    EmailTransport,
    EmailTransportError,
    SendContext,
    SendResult,
} from "./email.types";

export interface EmailServiceOptions {
    transport: EmailTransport;
    from: string;
    replyTo?: string;
    /** Total attempts including the first. */
    maxAttempts?: number;
    /** Delay before retry n is baseDelayMs * 2^(n-1): 500ms, 1000ms, ... */
    baseDelayMs?: number;
    sleep?: (ms: number) => Promise<void>;
}

const EMAIL_PATTERN = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Structured log line. Never include tokens, links, bodies or API keys. */
function log(level: "info" | "warn" | "error", fields: Record<string, unknown>): void {
    console[level](JSON.stringify({ scope: "email", ...fields }));
}

export function createEmailService(options: EmailServiceOptions) {
    const { transport, from, replyTo } = options;
    const maxAttempts = options.maxAttempts ?? 3;
    const baseDelayMs = options.baseDelayMs ?? 500;
    const sleep = options.sleep ?? defaultSleep;

    return {
        /**
         * Render and send a template. Never throws: failures are logged and reported in the result,
         * so a failing mail provider cannot break the calling request.
         */
        async send<K extends EmailTemplateName>(
            template: K,
            to: string,
            data: EmailTemplateDataMap[K],
            context: SendContext,
        ): Promise<SendResult> {
            const logContext = {
                template,
                provider: transport.name,
                companyId: context.companyId,
                requestId: context.requestId,
            };

            const recipient = toSingleLine(to);
            if (!EMAIL_PATTERN.test(recipient)) {
                log("error", { ...logContext, event: "email.invalid_recipient" });
                return { ok: false, attempts: 0 };
            }

            let rendered;
            try {
                rendered = renderTemplate(template, context.company, data);
            } catch (err) {
                // Message only names the invalid field, never the value.
                log("error", {
                    ...logContext,
                    recipient,
                    event: "email.render_failed",
                    reason: err instanceof Error ? err.message : "unknown",
                });
                return { ok: false, attempts: 0 };
            }

            const message = {
                from,
                replyTo,
                to: recipient,
                ...rendered,
                idempotencyKey: context.idempotencyKey ?? randomUUID(),
            };

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    await transport.send(message);
                    log("info", { ...logContext, recipient, event: "email.sent", attempt });
                    return { ok: true, attempts: attempt };
                } catch (err) {
                    const retryable = err instanceof EmailTransportError ? err.retryable : true;
                    const status = err instanceof EmailTransportError ? err.status : undefined;
                    const willRetry = retryable && attempt < maxAttempts;
                    log(willRetry ? "warn" : "error", {
                        ...logContext,
                        recipient,
                        event: willRetry ? "email.attempt_failed" : "email.failed",
                        attempt,
                        status,
                        retryable,
                        errorType: err instanceof Error ? err.name : "unknown",
                    });
                    if (!willRetry) {
                        return { ok: false, attempts: attempt };
                    }
                    await sleep(baseDelayMs * 2 ** (attempt - 1));
                }
            }
            return { ok: false, attempts: maxAttempts };
        },
    };
}

export type EmailServiceInstance = ReturnType<typeof createEmailService>;

/** Builds the transport selected by configuration. */
export function createTransportFromConfig(): EmailTransport {
    if (config.EMAIL_PROVIDER === "resend") {
        return new ResendTransport(config.RESEND_API_KEY as string);
    }
    return new ConsoleTransport(config.NODE_ENV === "development");
}

let instance: EmailServiceInstance | undefined;

/** Lazily-built service from env config (validated at boot by validateEnv). */
export const EmailService = {
    send<K extends EmailTemplateName>(
        template: K,
        to: string,
        data: EmailTemplateDataMap[K],
        context: SendContext,
    ): Promise<SendResult> {
        instance ??= createEmailService({
            transport: createTransportFromConfig(),
            from: config.EMAIL_FROM,
            replyTo: config.EMAIL_REPLY_TO,
        });
        return instance.send(template, to, data, context);
    },
};
