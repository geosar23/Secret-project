import dotenv from "dotenv";
dotenv.config();

const REQUIRED_VARS = [
    "MONGO_URI",
    "JWT_SECRET",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_STORAGE_BUCKET",
    "SALARY_ENCRYPTION_KEY",
] as const;

type EnvLike = Record<string, string | undefined>;

const EMAIL_TRANSPORTS = ["console", "resend"] as const;
export type EmailTransportName = (typeof EMAIL_TRANSPORTS)[number];

/** Transport in use: explicit EMAIL_TRANSPORT, else "console" (production must set it explicitly). */
export function resolveEmailTransport(env: EnvLike = process.env): string {
    return (env.EMAIL_TRANSPORT ?? "console").trim().toLowerCase();
}

/**
 * Pure email config check (exported for tests). Strict in production only:
 * development and test fall back to the console transport.
 */
export function getEmailConfigErrors(env: EnvLike = process.env): string[] {
    const errors: string[] = [];
    const isProduction = env.NODE_ENV === "production";
    const transport = resolveEmailTransport(env);
    const from = (env.EMAIL_FROM ?? "").trim();

    if (!(EMAIL_TRANSPORTS as readonly string[]).includes(transport)) {
        errors.push(`EMAIL_TRANSPORT must be one of: ${EMAIL_TRANSPORTS.join(", ")}, got: "${transport}"`);
    }
    if (isProduction && transport === "console") {
        errors.push(`EMAIL_TRANSPORT=console is not allowed in production (emails would never be delivered)`);
    }
    if (isProduction || from) {
        // "Name <a@b.com>" or "a@b.com"
        if (!/^(?:[^<>\r\n]+<)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/.test(from)) {
            errors.push(`EMAIL_FROM must be a valid sender address (e.g. "HRMS <no-reply@your-domain.com>")`);
        }
    }
    if (transport === "resend" && !(env.RESEND_API_KEY ?? "").trim()) {
        errors.push(`RESEND_API_KEY is required when EMAIL_TRANSPORT=resend`);
    }
    return errors;
}

export function validateEnv(): void {
    const missing: string[] = [];
    const invalid: string[] = [];

    for (const key of REQUIRED_VARS) {
        const value = process.env[key];
        if (!value || value.trim() === "") {
            missing.push(key);
        }
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? "";
    if (supabaseUrl && !supabaseUrl.startsWith("https://")) {
        invalid.push(
            `SUPABASE_URL must be an HTTPS URL (e.g. https://<project-ref>.supabase.co), got: "${supabaseUrl}"`,
        );
    }

    const salaryEncryptionKey = process.env.SALARY_ENCRYPTION_KEY ?? "";
    if (salaryEncryptionKey && !/^[0-9a-fA-F]{64}$/.test(salaryEncryptionKey)) {
        invalid.push(
            `SALARY_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32`,
        );
    }

    const port = process.env.PORT;
    if (port !== undefined && (isNaN(Number(port)) || Number(port) <= 0)) {
        invalid.push(`PORT must be a positive number, got: "${port}"`);
    }

    invalid.push(...getEmailConfigErrors());

    const errors = [...missing.map(k => `  - ${k} is required but not set`), ...invalid.map(msg => `  - ${msg}`)];

    if (errors.length > 0) {
        console.error("\n[env] Server startup aborted — invalid environment configuration:");
        for (const err of errors) {
            console.error(err);
        }
        console.error("\nCheck your server/.env file and ensure all required variables are present.\n");
        process.exit(1);
    }
}

export const config = {
    PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
    MONGO_URI: process.env.MONGO_URI as string,
    JWT_SECRET: process.env.JWT_SECRET as string,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",
    SUPABASE_URL: process.env.SUPABASE_URL as string,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET as string,
    SALARY_ENCRYPTION_KEY: process.env.SALARY_ENCRYPTION_KEY as string,
    CLIENT_URL: (process.env.CLIENT_URL ?? "http://localhost:4200").split(",").map(u => u.trim()),
    NODE_ENV: process.env.NODE_ENV ?? "development",
    EMAIL_TRANSPORT: resolveEmailTransport(),
    EMAIL_FROM: (process.env.EMAIL_FROM ?? "HRMS <no-reply@localhost>").trim(),
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO?.trim() || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY?.trim() || undefined,
};
