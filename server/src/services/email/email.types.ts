export interface EmailMessage {
    from: string;
    replyTo?: string;
    to: string;
    subject: string;
    html: string;
    text: string;
    /** Stable across retries so the provider can de-duplicate. */
    idempotencyKey: string;
}

/** Thrown by transports. `retryable` drives the retry strategy. */
export class EmailTransportError extends Error {
    constructor(
        message: string,
        public readonly retryable: boolean,
        public readonly status?: number,
    ) {
        super(message);
        this.name = "EmailTransportError";
    }
}

export interface EmailTransport {
    readonly name: string;
    send(message: EmailMessage): Promise<void>;
}

/** Tenant branding. Only the company name is stored today; logo/color are optional hooks. */
export interface EmailBranding {
    companyName: string;
    /** Public, non-expiring https URL (signed storage URLs expire, so do not pass those). */
    logoUrl?: string;
    /** Hex color such as #2563eb. */
    primaryColor?: string;
}

export interface RenderedEmail {
    subject: string;
    html: string;
    text: string;
}

export interface EmailTemplateDataMap {
    test: Record<string, never>;
    invitation: { recipientName: string; inviterName?: string; activationLink: string; expiresInHours: number };
    "password-reset": { recipientName: string; resetLink: string; expiresInMinutes: number };
}

export type EmailTemplateName = keyof EmailTemplateDataMap;

export interface SendContext {
    company: EmailBranding;
    /** Correlation id of the calling request, when available. */
    requestId?: string;
    /** Company id for log context (tenant-aware auditing). */
    companyId?: string;
}

export interface SendResult {
    ok: boolean;
    attempts: number;
}
