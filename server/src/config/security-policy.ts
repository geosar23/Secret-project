/**
 * Per-company security knobs. Today every company gets the defaults below; a later ticket moves them into a
 * per-company settings collection. Callers must go through getSecurityPolicy(companyId) so that change stays local.
 */
export interface SecurityPolicy {
    /** Same minimum as the change-password and create-user rules. */
    minPasswordLength: number;
    /** Lifetime of a forgot-password link. */
    forgotTokenMinutes: number;
    /** Lifetime of an invitation link (used by the invite flow). */
    inviteTokenHours: number;
    /** How long an admin-issued temporary password can still be used to sign in. */
    temporaryPasswordHours: number;
    /** Reset emails sent to one account per hour; further requests are dropped silently. */
    forgotEmailsPerHour: number;
}

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
    minPasswordLength: 6,
    forgotTokenMinutes: 30,
    inviteTokenHours: 72,
    temporaryPasswordHours: 24,
    forgotEmailsPerHour: 3,
};

// The company id is unused until policies become per-company.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getSecurityPolicy(_companyId?: string): Promise<SecurityPolicy> {
    return DEFAULT_SECURITY_POLICY;
}

/** Per-IP limits of the unauthenticated recovery endpoints (company is unknown before the lookup). */
export const AUTH_RATE_LIMITS = {
    windowMs: 15 * 60 * 1000,
    forgotPassword: 5,
    passwordSetup: 10,
} as const;
