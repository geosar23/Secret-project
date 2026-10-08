import { Response } from "express";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { ApprovalEngine } from "../services/approvals/request.service";
import { RequestTypeConfigService } from "../services/approvals/request-type-config.service";
import { RequestViewService } from "../services/approvals/request-view.service";
import { BadRequestError, NotFoundError } from "../utils/app-error.util";
import { success } from "../utils/response.util";
import { Types } from "mongoose";

const token = (req: AuthenticatedRequest) => req.decoded as tokenPayload;
const query = (req: AuthenticatedRequest) => req.query as Record<string, unknown>;

function requestIdOf(req: AuthenticatedRequest): string {
    if (!Types.ObjectId.isValid(req.params.id)) {
        throw new NotFoundError("Request not found");
    }
    return req.params.id;
}

/** Shared engine endpoints, used by every request type. Errors are thrown and mapped by the error middleware. */
export class RequestController {
    static async inbox(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = token(req);
        res.json(success(await RequestViewService.inbox(companyId, id, query(req))));
    }

    static async mine(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = token(req);
        res.json(success(await RequestViewService.mine(companyId, id, query(req))));
    }

    static async summary(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = token(req);
        res.json(success(await RequestViewService.summary(companyId, id)));
    }

    static async get(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = token(req);
        res.json(success(await RequestViewService.get(companyId, id, requestIdOf(req))));
    }

    static async decide(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = token(req);
        const { decision, comment } = (req.body ?? {}) as { decision?: unknown; comment?: unknown };
        if (decision !== "approve" && decision !== "reject") {
            throw new BadRequestError('decision must be "approve" or "reject"');
        }
        if (comment !== undefined && typeof comment !== "string") {
            throw new BadRequestError("comment must be a string");
        }
        const requestId = requestIdOf(req);
        await ApprovalEngine.decide(companyId, { id }, requestId, {
            decision,
            comment: (comment as string | undefined)?.trim() || undefined,
        });
        res.json(success(await RequestViewService.get(companyId, id, requestId)));
    }

    static async cancel(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = token(req);
        const { reason } = (req.body ?? {}) as { reason?: unknown };
        if (typeof reason !== "string" || !reason.trim()) {
            throw new BadRequestError("A cancellation reason is required");
        }
        const requestId = requestIdOf(req);
        await ApprovalEngine.cancel(companyId, requestId, { reason, actor: { id } });
        res.json(success(await RequestViewService.get(companyId, id, requestId)));
    }

    static async listTypes(req: AuthenticatedRequest, res: Response): Promise<void> {
        res.json(success(await RequestTypeConfigService.listActive(token(req).companyId)));
    }
}
