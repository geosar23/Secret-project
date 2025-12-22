import { AuthenticatedRequest } from "../interfaces/auth.interface";

/**
 * Helper function to attach company context to a Mongoose query
 * Usage: applyCompanyContext(UserModel.find(), req).exec()
 */
export function applyCompanyContext(query: unknown, req: AuthenticatedRequest): unknown {
    if (req.companyId) {
        (query as { companyId?: string }).companyId = req.companyId;
    }
    return query;
}

/**
 * Utility to check if request has valid company context
 */
export function hasCompanyContext(req: AuthenticatedRequest): boolean {
    return !!req.companyId;
}

/**
 * Utility to get company ID from request
 */
export function getCompanyId(req: AuthenticatedRequest): string | undefined {
    return req.companyId;
}
