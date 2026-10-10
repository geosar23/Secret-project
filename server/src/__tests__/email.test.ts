import { createEmailService } from "../services/email/email.service";
import { ConsoleTransport } from "../services/email/email.transports";
import { brandingFromCompany, escapeHtml, renderTemplate } from "../services/email/email.templates";
import { EmailMessage, EmailTransport, EmailTransportError } from "../services/email/email.types";
import { getEmailConfigErrors } from "../config/env";

const SECRET_LINK = "https://app.example.com/activate?token=SUPER-SECRET-TOKEN-123";
const company = { companyName: "Acme <b>Corp</b>" };
const ctx = { company, requestId: "req-42", companyId: "company-1" };
const invitation = {
    recipientName: "Eve <script>alert(1)</script>",
    activationLink: SECRET_LINK,
    expiresInHours: 48,
};

function mockTransport(impl: (m: EmailMessage) => Promise<void> = async () => undefined) {
    const send = jest.fn(impl);
    const transport: EmailTransport = { name: "mock", send };
    return { transport, send };
}

function build(transport: EmailTransport, maxAttempts = 3) {
    const sleep = jest.fn<Promise<void>, [number]>(async () => undefined);
    const service = createEmailService({ transport, from: "HRMS <no-reply@example.com>", maxAttempts, sleep });
    return { service, sleep };
}

describe("EmailService", () => {
    let logs: string[];

    beforeEach(() => {
        logs = [];
        const capture = (...args: unknown[]) => void logs.push(args.map(String).join(" "));
        jest.spyOn(console, "info").mockImplementation(capture);
        jest.spyOn(console, "warn").mockImplementation(capture);
        jest.spyOn(console, "error").mockImplementation(capture);
    });
    afterEach(() => jest.restoreAllMocks());

    it("sends a rendered message on success", async () => {
        const { transport, send } = mockTransport();
        const { service } = build(transport);

        const result = await service.send("invitation", "eve@example.com", invitation, ctx);

        expect(result).toEqual({ ok: true, attempts: 1 });
        const message = send.mock.calls[0][0];
        expect(message.to).toBe("eve@example.com");
        expect(message.from).toBe("HRMS <no-reply@example.com>");
        expect(message.html).toContain(SECRET_LINK);
        expect(message.text).toContain(SECRET_LINK);
        expect(message.idempotencyKey).toBeTruthy();
    });

    it("escapes interpolated values in HTML and keeps the subject single-line", () => {
        const rendered = renderTemplate("invitation", { companyName: "Acme\r\nBcc: x@evil.com <i>" }, invitation);

        expect(rendered.html).not.toContain("<script>");
        expect(rendered.html).toContain("Eve &lt;script&gt;alert(1)&lt;/script&gt;");
        expect(rendered.html).not.toContain("<i>");
        expect(rendered.subject).not.toMatch(/[\r\n]/);
        expect(escapeHtml(`"'&<>`)).toBe("&quot;&#39;&amp;&lt;&gt;");
        expect(rendered.text).toContain("Activate account:");
    });

    it("renders all templates with HTML + text and branding", () => {
        const brand = { companyName: "Acme", primaryColor: "#112233", logoUrl: "https://cdn.example.com/logo.png" };
        for (const [name, data] of [
            ["test-email", {}],
            ["password-reset-notice", { recipientName: "Eve", resetAt: new Date("2026-10-10T14:05:00Z") }],
            ["invitation", invitation],
            ["password-reset", { recipientName: "Eve", resetLink: SECRET_LINK, expiresInMinutes: 30 }],
        ] as const) {
            const out = renderTemplate(name, brand, data as never);
            expect(out.subject).toBeTruthy();
            expect(out.html).toContain("#112233");
            expect(out.html).toContain("https://cdn.example.com/logo.png");
            expect(out.text).toContain("Acme");
        }
        expect(brandingFromCompany({ name: "Acme" })).toEqual({ companyName: "Acme" });
    });

    it("rejects non-http links and ignores invalid colors", () => {
        expect(() =>
            renderTemplate("invitation", company, { ...invitation, activationLink: "javascript:alert(1)" }),
        ).toThrow();
        const out = renderTemplate("test-email", { companyName: "A", primaryColor: "red;x" }, {});
        expect(out.html).toContain("#2563eb");
    });

    it("retries with exponential backoff, then succeeds", async () => {
        const { transport, send } = mockTransport();
        send.mockRejectedValueOnce(new EmailTransportError("x", true, 503)).mockRejectedValueOnce(new Error("net"));
        const { service, sleep } = build(transport);

        const result = await service.send("test-email", "eve@example.com", {}, ctx);

        expect(result).toEqual({ ok: true, attempts: 3 });
        expect(sleep.mock.calls.map(c => c[0])).toEqual([500, 1000]);
        const keys = new Set(send.mock.calls.map(c => c[0].idempotencyKey));
        expect(keys.size).toBe(1);
    });

    it("does not throw when retries are exhausted", async () => {
        const { transport, send } = mockTransport(async () => {
            throw new EmailTransportError("down", true, 500);
        });
        const { service } = build(transport);

        await expect(service.send("test-email", "eve@example.com", {}, ctx)).resolves.toEqual({
            ok: false,
            attempts: 3,
        });
        expect(send).toHaveBeenCalledTimes(3);
    });

    it("does not retry permanent errors", async () => {
        const { transport, send } = mockTransport(async () => {
            throw new EmailTransportError("bad", false, 422);
        });
        const { service, sleep } = build(transport);

        await expect(service.send("test-email", "eve@example.com", {}, ctx)).resolves.toEqual({
            ok: false,
            attempts: 1,
        });
        expect(send).toHaveBeenCalledTimes(1);
        expect(sleep).not.toHaveBeenCalled();
    });

    it("does not throw for an invalid recipient or invalid link", async () => {
        const { transport, send } = mockTransport();
        const { service } = build(transport);

        expect((await service.send("test-email", "not-an-email", {}, ctx)).ok).toBe(false);
        expect((await service.send("invitation", "a@b.com", { ...invitation, activationLink: "nope" }, ctx)).ok).toBe(
            false,
        );
        expect(send).not.toHaveBeenCalled();
    });

    it("logs failures with request context and no sensitive data", async () => {
        const { transport } = mockTransport(async () => {
            throw new EmailTransportError(`boom ${SECRET_LINK} password=hunter2`, true, 500);
        });
        const { service } = build(transport);

        await service.send("invitation", "eve@example.com", invitation, ctx);
        await service.send("invitation", "eve@example.com", { ...invitation, activationLink: "bad" }, ctx);

        const all = logs.join("\n");
        expect(all).toContain("req-42");
        expect(all).toContain("company-1");
        expect(all).toContain("email.failed");
        expect(all).not.toContain("SUPER-SECRET-TOKEN");
        expect(all).not.toContain("hunter2");
        expect(all).toContain("eve@example.com");
        expect(all).not.toContain("<script>");
        expect(all).not.toContain("Eve");
    });
});

describe("ConsoleTransport", () => {
    it("omits the body unless logBody is enabled", async () => {
        const info = jest.spyOn(console, "info").mockImplementation(() => undefined);
        const message = {
            from: "a@b.com",
            to: "c@d.com",
            subject: "S",
            html: "",
            text: "LINK-BODY",
            idempotencyKey: "k",
        };

        await new ConsoleTransport().send(message);
        expect(info.mock.calls.flat().join(" ")).not.toContain("LINK-BODY");

        await new ConsoleTransport(true).send(message);
        expect(info.mock.calls.flat().join(" ")).toContain("LINK-BODY");
        info.mockRestore();
    });
});

describe("email config validation", () => {
    const prodBase = {
        NODE_ENV: "production",
        EMAIL_PROVIDER: "resend",
        EMAIL_FROM: "HRMS <no-reply@example.com>",
        RESEND_API_KEY: "re_key",
    };

    it("accepts a complete production config", () => {
        expect(getEmailConfigErrors(prodBase)).toEqual([]);
    });

    it("fails fast in production when config is missing or invalid", () => {
        expect(getEmailConfigErrors({ NODE_ENV: "production" }).length).toBeGreaterThanOrEqual(2); // console + sender
        expect(getEmailConfigErrors({ ...prodBase, RESEND_API_KEY: "" })).toEqual([
            expect.stringContaining("RESEND_API_KEY"),
        ]);
        expect(getEmailConfigErrors({ ...prodBase, EMAIL_FROM: "nope" })).toEqual([
            expect.stringContaining("EMAIL_FROM"),
        ]);
        expect(getEmailConfigErrors({ ...prodBase, EMAIL_PROVIDER: "smtp" })).toEqual([
            expect.stringContaining("EMAIL_PROVIDER"),
        ]);
    });

    it("falls back to the console transport in development and test without config", () => {
        expect(getEmailConfigErrors({ NODE_ENV: "development" })).toEqual([]);
        expect(getEmailConfigErrors({ NODE_ENV: "test" })).toEqual([]);
        expect(getEmailConfigErrors({})).toEqual([]);
    });
});
