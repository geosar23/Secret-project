import rateLimit, { MemoryStore } from "express-rate-limit";
import { AUTH_RATE_LIMITS } from "../config/security-policy";
import { tooManyRequestsError } from "../utils/response.util";

// In-memory counters: per server instance and reset on restart. Use a shared store if the API ever scales out.
const forgotPasswordStore = new MemoryStore();
const passwordSetupStore = new MemoryStore();

const strictLimiter = (limit: number, store: MemoryStore) =>
    rateLimit({
        windowMs: AUTH_RATE_LIMITS.windowMs,
        limit,
        store,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) => tooManyRequestsError(res),
    });

export const forgotPasswordLimiter = strictLimiter(AUTH_RATE_LIMITS.forgotPassword, forgotPasswordStore);
export const passwordSetupLimiter = strictLimiter(AUTH_RATE_LIMITS.passwordSetup, passwordSetupStore);

/** Test hook: clears the counters. */
export function resetAuthRateLimits(): void {
    forgotPasswordStore.resetAll();
    passwordSetupStore.resetAll();
}
