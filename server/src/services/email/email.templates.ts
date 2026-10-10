import { EmailBranding, EmailTemplateDataMap, EmailTemplateName, RenderedEmail } from "./email.types";

export function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Control characters and Unicode line/paragraph separators.
// eslint-disable-next-line no-control-regex
const LINE_BREAKS_AND_CONTROLS = new RegExp("[\\u0000-\\u001f\\u007f\\u2028\\u2029]+", "g");

/** Single line, no control characters (prevents header injection via subject/names). */
export function toSingleLine(value: unknown): string {
    return String(value ?? "")
        .replace(LINE_BREAKS_AND_CONTROLS, " ")
        .trim();
}

function assertHttpUrl(value: string, field: string): string {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error(`Invalid ${field}`);
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error(`Invalid ${field}`);
    }
    return url.toString();
}

const DEFAULT_COLOR = "#2563eb";

function safeColor(value?: string): string {
    return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_COLOR;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** DD/MM/YYYY HH:mm UTC. */
export function formatUtc(date: Date): string {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        throw new Error("Invalid date");
    }
    return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

interface Body {
    subject: string;
    heading: string;
    /** Paragraphs as plain strings; they are escaped for HTML, used as-is for text. */
    paragraphs: string[];
    action?: { label: string; url: string };
    /** Value shown in a boxed monospace block (e.g. a temporary password). Escaped for HTML. */
    highlight?: { label: string; value: string };
}

function layout(brand: EmailBranding, body: Body): RenderedEmail {
    const company = toSingleLine(brand.companyName);
    const color = safeColor(brand.primaryColor);
    const logo = brand.logoUrl
        ? `<img src="${escapeHtml(assertHttpUrl(brand.logoUrl, "logoUrl"))}" alt="${escapeHtml(company)}" height="40" style="display:block;margin-bottom:12px">`
        : "";
    const paragraphs = body.paragraphs.map(p => `<p style="margin:0 0 16px">${escapeHtml(p)}</p>`).join("");
    const highlight = body.highlight
        ? `<p style="margin:0 0 6px;font-size:13px;color:#6b7280">${escapeHtml(body.highlight.label)}</p>` +
          `<p style="margin:0 0 16px;padding:12px 16px;background:#f3f4f6;border-radius:6px;font-family:Consolas,Menlo,monospace;font-size:16px;letter-spacing:0.5px;word-break:break-all">${escapeHtml(body.highlight.value)}</p>`
        : "";
    const button = body.action
        ? `<p style="margin:24px 0"><a href="${escapeHtml(body.action.url)}" style="background:${color};color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">${escapeHtml(body.action.label)}</a></p>` +
          `<p style="margin:0 0 16px;font-size:12px;color:#6b7280">If the button does not work, copy this link into your browser:<br>${escapeHtml(body.action.url)}</p>`
        : "";

    const html =
        `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">` +
        `<div style="max-width:560px;margin:0 auto;background:#ffffff;padding:32px;border-radius:8px;border-top:4px solid ${color}">` +
        `${logo}<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(body.heading)}</h1>${paragraphs}${highlight}${button}` +
        `<p style="margin:24px 0 0;font-size:12px;color:#6b7280">Sent by ${escapeHtml(company)} via HRMS</p>` +
        `</div></body></html>`;

    const text = [
        body.heading,
        "",
        ...body.paragraphs.flatMap(p => [p, ""]),
        ...(body.highlight ? [`${body.highlight.label}: ${body.highlight.value}`, ""] : []),
        ...(body.action ? [`${body.action.label}: ${body.action.url}`, ""] : []),
        `Sent by ${company} via HRMS`,
    ].join("\n");

    return { subject: toSingleLine(body.subject), html, text };
}

type Renderer<K extends EmailTemplateName> = (brand: EmailBranding, data: EmailTemplateDataMap[K]) => RenderedEmail;

const renderers: { [K in EmailTemplateName]: Renderer<K> } = {
    "test-email": brand => {
        const company = toSingleLine(brand.companyName);
        return layout(brand, {
            subject: `Test email from ${company}`,
            heading: "Email is working",
            paragraphs: ["This is a test message confirming that transactional email is configured correctly."],
        });
    },

    invitation: (brand, data) => {
        const company = toSingleLine(brand.companyName);
        const name = toSingleLine(data.recipientName);
        const inviter = data.inviterName ? toSingleLine(data.inviterName) : undefined;
        return layout(brand, {
            subject: `You have been invited to ${company}`,
            heading: `Welcome to ${company}`,
            paragraphs: [
                `Hi ${name},`,
                inviter
                    ? `${inviter} has invited you to join ${company}. Activate your account and choose a password to get started.`
                    : `You have been invited to join ${company}. Activate your account and choose a password to get started.`,
                `This link expires in ${Number(data.expiresInHours)} hours and can be used once.`,
            ],
            action: { label: "Activate account", url: assertHttpUrl(data.activationLink, "activationLink") },
        });
    },

    "password-reset-notice": (brand, data) => {
        const company = toSingleLine(brand.companyName);
        const name = toSingleLine(data.recipientName);
        return layout(brand, {
            subject: `Your ${company} password was reset`,
            heading: "Your password was reset",
            paragraphs: [
                `Hi ${name},`,
                `An administrator at ${company} reset your password on ${formatUtc(data.resetAt)}. Use the temporary password below to sign in, then change it to one only you know.`,
                "If you did not expect this, contact your HR team or administrator right away.",
            ],
            highlight: { label: "Temporary password", value: data.temporaryPassword },
        });
    },

    "password-reset": (brand, data) => {
        const name = toSingleLine(data.recipientName);
        return layout(brand, {
            subject: "Reset your password",
            heading: "Reset your password",
            paragraphs: [
                `Hi ${name},`,
                "We received a request to reset your password. Use the button below to choose a new one.",
                `This link expires in ${Number(data.expiresInMinutes)} minutes and can be used once. If you did not request this, you can ignore this email.`,
            ],
            action: { label: "Reset password", url: assertHttpUrl(data.resetLink, "resetLink") },
        });
    },
};

export function renderTemplate<K extends EmailTemplateName>(
    template: K,
    brand: EmailBranding,
    data: EmailTemplateDataMap[K],
): RenderedEmail {
    const render = renderers[template] as Renderer<K> | undefined;
    if (!render) {
        throw new Error(`Unknown email template: ${String(template)}`);
    }
    return render(brand, data);
}

/** Branding hook: map a Company document to the branding input (logo/color are not stored yet). */
export function brandingFromCompany(company: { name: string }): EmailBranding {
    return { companyName: company.name };
}
