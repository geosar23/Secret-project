import bcrypt from "bcryptjs";
import { clientBaseUrl } from "../config/env";
import { getSecurityPolicy } from "../config/security-policy";
import { OneTimeTokenPurpose } from "../interfaces/one-time-token.interface";
import { companyRepository } from "../repositories/company.repository";
import { oneTimeTokenIdentityRepository, oneTimeTokenRepository } from "../repositories/one-time-token.repository";
import { userIdentityRepository, userRepository } from "../repositories/user.repository";
import { authLog } from "../utils/auth-log.util";
import { generateRawToken, hashToken } from "../utils/one-time-token.util";
import { AuditService } from "./audit.service";
import { brandingFromCompany } from "./email/email.templates";
import { EmailService } from "./email/email.service";
import { notifyPasswordChanged } from "./email/email.notifications";

/** Purposes the password-setup endpoint accepts. The invite flow (P0-24) adds "invite" here. */
const SETUP_PURPOSES: readonly OneTimeTokenPurpose[] = ["forgot"];

export type PasswordSetupFailure = "invalid" | "expired" | "used" | "weak_password";

export class PasswordSetupError extends Error {
    constructor(
        readonly code: PasswordSetupFailure,
        readonly minLength?: number,
    ) {
        super(code);
        this.name = "PasswordSetupError";
    }
}

// Work started after the response was sent; tests drain it, production ignores it.
const background = new Set<Promise<unknown>>();
export function runInBackground(work: Promise<unknown>): void {
    const tracked: Promise<unknown> = work.catch(() => undefined).finally(() => background.delete(tracked));
    background.add(tracked);
}
export async function drainBackground(): Promise<void> {
    while (background.size) {
        await Promise.all([...background]);
    }
}

export const PasswordSetupService = {
    /**
     * Forgot-password: issues a link when the email belongs to an active account. Never reveals whether it did:
     * every outcome returns normally, and failures are only logged (ids and reasons, never the email or the link).
     */
    async requestReset(email: string, requestId?: string): Promise<void> {
        try {
            const user = await userIdentityRepository()
                .findByEmail(email)
                .select("name email password isActive company")
                .populate("company", "name isActive")
                .lean();

            const company = user?.company as unknown as { _id: unknown; name: string; isActive?: boolean } | undefined;
            if (!user || !company) {
                authLog("password_reset.requested", { outcome: "ignored", reason: "unknown_account", requestId });
                return;
            }
            const companyId = String(company._id);
            const userId = String(user._id);
            if (!user.isActive || company.isActive === false || !user.password) {
                authLog("password_reset.requested", {
                    outcome: "ignored",
                    reason: "not_eligible",
                    userId,
                    companyId,
                    requestId,
                });
                return;
            }

            const policy = await getSecurityPolicy(companyId);
            const tokens = oneTimeTokenRepository(companyId);
            const now = new Date();

            const recent = await tokens.count({
                user: user._id,
                purpose: "forgot",
                createdAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) },
            });
            if (recent >= policy.forgotEmailsPerHour) {
                authLog("password_reset.requested", {
                    outcome: "ignored",
                    reason: "rate_limited",
                    userId,
                    companyId,
                    requestId,
                });
                return;
            }

            // Only the newest link works.
            await tokens.updateMany({ user: user._id, purpose: "forgot", usedAt: null }, { $set: { usedAt: now } });

            const raw = generateRawToken();
            await tokens.create({
                tokenHash: hashToken(raw),
                user: user._id,
                purpose: "forgot",
                expiresAt: new Date(now.getTime() + policy.forgotTokenMinutes * 60 * 1000),
            });

            const result = await EmailService.send(
                "password-reset",
                user.email,
                {
                    recipientName: user.name,
                    resetLink: `${clientBaseUrl()}/password-setup?token=${raw}`,
                    expiresInMinutes: policy.forgotTokenMinutes,
                },
                { company: brandingFromCompany({ name: company.name }), companyId, requestId },
            );
            authLog("password_reset.requested", {
                outcome: result.ok ? "sent" : "send_failed",
                userId,
                companyId,
                requestId,
            });
        } catch {
            authLog("password_reset.requested", { outcome: "error", requestId });
        }
    },

    /** Redeems a link token and sets the new password. Throws PasswordSetupError with a specific code. */
    async redeem(rawToken: unknown, newPassword: unknown, requestId?: string): Promise<void> {
        const fail = (code: PasswordSetupFailure, extra: Record<string, unknown> = {}, minLength?: number): never => {
            authLog("password_reset.failed", { reason: code, requestId, ...extra });
            throw new PasswordSetupError(code, minLength);
        };

        if (typeof rawToken !== "string" || rawToken.length < 20 || rawToken.length > 200) {
            return fail("invalid");
        }
        const tokenHash = hashToken(rawToken);
        const identity = oneTimeTokenIdentityRepository();

        const found = await identity.findByHash(tokenHash).lean();
        if (!found || !SETUP_PURPOSES.includes(found.purpose)) {
            return fail("invalid");
        }
        const companyId = String(found.company);
        const userId = String(found.user);
        const ids = { userId, companyId };
        if (found.usedAt) {
            return fail("used", ids);
        }
        if (found.expiresAt.getTime() <= Date.now()) {
            return fail("expired", ids);
        }

        // Checked before the token is consumed so a too-short password does not burn the link.
        const policy = await getSecurityPolicy(companyId);
        if (typeof newPassword !== "string" || newPassword.length < policy.minPasswordLength) {
            return fail("weak_password", ids, policy.minPasswordLength);
        }

        const now = new Date();
        const consumed = await identity.consume(tokenHash, SETUP_PURPOSES, now).lean();
        if (!consumed) {
            return fail("used", ids); // lost a race with another request
        }

        const users = userRepository(companyId);
        try {
            const user = await users.findById(userId).select("name email password isActive").lean();
            if (!user || !user.isActive) {
                await identity.release(tokenHash);
                return fail("invalid", ids);
            }

            const hashed = await bcrypt.hash(newPassword, 10);
            await users.updateOne(
                { _id: userId },
                {
                    password: hashed,
                    jwtTokenRevokedAt: now,
                    mustChangePassword: false,
                    temporaryPasswordExpiresAt: null,
                },
            );

            // Any other outstanding link for this user is now pointless.
            await oneTimeTokenRepository(companyId).updateMany(
                { user: userId, usedAt: null },
                { $set: { usedAt: now } },
            );

            await AuditService.record(companyId, {
                actor: userId,
                entity: "user",
                entityId: userId,
                action: "password_reset",
                before: { password: user.password },
                after: { password: hashed },
            }).catch(() => authLog("password_reset.audit_failed", ids));
            authLog("password_reset.completed", { ...ids, requestId });

            const company = await companyRepository().findById(companyId).select("name").lean();
            notifyPasswordChanged(
                {
                    name: user.name,
                    email: user.email,
                    company: company ? { _id: company._id, name: company.name } : null,
                },
                now,
                requestId,
            );
        } catch (err) {
            if (err instanceof PasswordSetupError) {
                throw err;
            }
            await identity.release(tokenHash).catch(() => undefined);
            authLog("password_reset.failed", { reason: "error", ...ids, requestId });
            throw err;
        }
    },
};
