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
    CLIENT_URL: process.env.CLIENT_URL ?? "http://localhost:4200",
    OG_COMPANY_ID: process.env.OG_COMPANY_ID ?? "",
    NODE_ENV: process.env.NODE_ENV ?? "development",
};
