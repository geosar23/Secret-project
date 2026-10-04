import { NextFunction, Response } from "express";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { UserService } from "../services/user.service";
import { UserDocumentService } from "../services/user-document.service";
import { canManageUser, canViewUser, canViewUserProfile } from "../policies/user.policy";
import { isValidObjectId } from "../utils/field-sanitizer.util";
import { badRequestError, forbiddenError, hardError, notFoundError, unauthorizedError } from "../utils/response.util";

/**
 * Authorizes access to a user's documents against the document owner.
 * The owner comes from `:userId`, or from the document referenced by `:id`.
 * Reads are always allowed on one's own documents; writes need user-management write scope.
 */
export function userDocumentAccess(action: "read" | "write") {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const payload = req.decoded as tokenPayload | undefined;
            if (!payload?.id || !payload.companyId) {
                return unauthorizedError(res);
            }

            const actor = await UserService.getById(payload.id, payload.companyId);
            if (!actor) {
                return unauthorizedError(res);
            }

            let ownerId: string | undefined = req.params.userId;
            if (!ownerId) {
                if (!isValidObjectId(req.params.id)) {
                    return badRequestError(res);
                }
                const doc = await UserDocumentService.getById(req.params.id, payload.companyId);
                if (!doc) {
                    return notFoundError(res);
                }
                ownerId = String(doc.user);
            }

            if (!isValidObjectId(ownerId)) {
                return badRequestError(res);
            }

            const owner = await UserService.getById(ownerId, payload.companyId);
            if (!owner) {
                return notFoundError(res);
            }

            const allowed =
                action === "write"
                    ? canManageUser(actor, owner)
                    : payload.id === ownerId || canViewUser(actor, owner) || canViewUserProfile(actor, owner);

            if (!allowed) {
                return forbiddenError(res);
            }

            next();
        } catch (error) {
            console.error("User document authorization error:", error);
            return hardError(res);
        }
    };
}
