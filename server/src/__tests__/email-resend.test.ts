import { createEmailService } from "../services/email/email.service";
import { ResendTransport, isRetryableResendError } from "../services/email/email.transports";
import { renderTemplate } from "../services/email/email.templates";
import { getEmailConfigErrors } from "../config/env";

describe("password-reset-notice template", () => {
    const resetAt = new Date("2026-10-10T14:05:00Z");

    it("states when it happened (DD/MM/YYYY), tells the user what to do, and has no link or secret", () => {
        const out = renderTemplate("password-reset-notice", { companyName: "Acme" }, { recipientName: "Eve", resetAt });
        expect(out.subject).toBe("Your Acme password was reset");
        expect(out.text).toContain("10/10/2026 14:05 UTC");
        expect(out.text).toContain("contact your HR team or administrator");
        expect(out.html).not.toMatch(/href=/);
        expect(out.html + out.text).not.toMatch(/https?:\/\//);
    });

    it("escapes a malicious name and company name", () => {
        const out = renderTemplate(
            "password-reset-notice",
            { companyName: "<img src=x onerror=alert(1)>Co" },
            { recipientName: "<script>alert(1)</script>", resetAt },
        );
        expect(out.html).not.toContain("<script>");
        expect(out.html).not.toContain("<img src=x");
        expect(out.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    });

    it("rejects an invalid date instead of printing garbage", () => {
        expect(() =>
            renderTemplate(
                "password-reset-notice",
                { companyName: "Acme" },
                { recipientName: "Eve", resetAt: new Date("nope") },
            ),
        ).toThrow();
    });
});

describe("ResendTransport", () => {
    const message = {
        from: "HRMS <no-reply@example.com>",
        to: "eve@example.com",
        subject: "S",
        html: "<p>h</p>",
        text: "t",
        replyTo: "hr@example.com",
        idempotencyKey: "key-1",
    };
    const clientWith = (result: unknown) => {
        const send = jest.fn().mockResolvedValue(result);
        return { send, transport: new ResendTransport("re_key", { emails: { send } } as never) };
    };

    it("passes the payload and idempotency key to the SDK", async () => {
        const { send, transport } = clientWith({ data: { id: "1" }, error: null });
        await transport.send(message);
        expect(send).toHaveBeenCalledWith(
            expect.objectContaining({ to: ["eve@example.com"], replyTo: "hr@example.com", subject: "S" }),
            { idempotencyKey: "key-1" },
        );
    });

    it("turns an API { error } into a thrown EmailTransportError with the right retryability", async () => {
        const server = clientWith({ data: null, error: { name: "application_error", message: "x", statusCode: 500 } });
        await expect(server.transport.send(message)).rejects.toMatchObject({ retryable: true, status: 500 });

        const validation = clientWith({
            data: null,
            error: { name: "validation_error", message: "bad to", statusCode: 422 },
        });
        await expect(validation.transport.send(message)).rejects.toMatchObject({ retryable: false, status: 422 });
    });

    it("treats a thrown SDK/network error as retryable without leaking its message", async () => {
        const send = jest.fn().mockRejectedValue(new Error("ECONNRESET secret-detail"));
        const transport = new ResendTransport("re_key", { emails: { send } } as never);
        const error = await transport.send(message).catch((e: Error) => e);
        expect(error).toMatchObject({ retryable: true });
        expect((error as Error).message).not.toContain("secret-detail");
    });

    it("classifies errors", () => {
        expect(isRetryableResendError({ statusCode: null })).toBe(true);
        expect(isRetryableResendError({ statusCode: 429, name: "rate_limit_exceeded" })).toBe(true);
        expect(isRetryableResendError({ statusCode: 429, name: "daily_quota_exceeded" })).toBe(false);
        expect(isRetryableResendError({ statusCode: 409 })).toBe(true);
        expect(isRetryableResendError({ statusCode: 503 })).toBe(true);
        expect(isRetryableResendError({ statusCode: 400 })).toBe(false);
        expect(isRetryableResendError({ statusCode: 403 })).toBe(false);
    });

    it("EmailService retries a Resend 5xx and reuses the same idempotency key", async () => {
        const send = jest
            .fn()
            .mockResolvedValueOnce({ data: null, error: { name: "application_error", message: "x", statusCode: 502 } })
            .mockResolvedValueOnce({ data: { id: "1" }, error: null });
        const service = createEmailService({
            transport: new ResendTransport("re_key", { emails: { send } } as never),
            from: "HRMS <no-reply@example.com>",
            sleep: async () => undefined,
        });
        jest.spyOn(console, "info").mockImplementation(() => undefined);
        jest.spyOn(console, "warn").mockImplementation(() => undefined);

        const result = await service.send("test-email", "eve@example.com", {}, { company: { companyName: "Acme" } });

        expect(result).toEqual({ ok: true, attempts: 2 });
        const keys = send.mock.calls.map(c => c[1].idempotencyKey);
        expect(keys[0]).toBeTruthy();
        expect(keys[0]).toBe(keys[1]);
        jest.restoreAllMocks();
    });
});

describe("email config validation (provider rules)", () => {
    it("defaults to console and rejects resend without a key or sender", () => {
        expect(getEmailConfigErrors({ NODE_ENV: "development" })).toEqual([]);
        const errors = getEmailConfigErrors({ NODE_ENV: "development", EMAIL_PROVIDER: "resend" });
        expect(errors).toEqual(
            expect.arrayContaining([expect.stringContaining("RESEND_API_KEY"), expect.stringContaining("EMAIL_FROM")]),
        );
    });

    it("rejects the console provider in production", () => {
        expect(getEmailConfigErrors({ NODE_ENV: "production", EMAIL_FROM: "HRMS <no-reply@example.com>" })).toEqual([
            expect.stringContaining("EMAIL_PROVIDER=console"),
        ]);
    });
});
