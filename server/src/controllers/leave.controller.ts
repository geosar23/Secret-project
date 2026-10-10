import { Response } from "express";
import { Types } from "mongoose";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { canReadLeaveBalances } from "../policies/leave.policy";
import { loadAccessUser } from "../services/access-user.service";
import { periodOf, todayUtc } from "../services/leaves/leave-calculator";
import { LeaveLedgerService } from "../services/leaves/leave-ledger.service";
import { LeaveService } from "../services/leaves/leave.service";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/app-error.util";
import { success } from "../utils/response.util";

const token = (req: AuthenticatedRequest) => req.decoded as tokenPayload;

function yearOf(req: AuthenticatedRequest): string {
    const year = req.query.year === undefined ? periodOf(todayUtc()) : String(req.query.year);
    if (!/^\d{4}$/.test(year)) {
        throw new BadRequestError("year must be YYYY");
    }
    return year;
}

export class LeaveController {
    static async preview(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = token(req);
        res.json(success(await LeaveService.preview(companyId, id, req.body)));
    }

    static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = token(req);
        const { request, leaveRequestId } = await LeaveService.create(companyId, id, req.body);
        res.status(201).json(
            success({
                leaveRequestId,
                requestId: String(request._id),
                status: request.status,
                needsRouting: request.needsRouting,
                pendingApprovers: request.pendingApprovers.map(String),
            }),
        );
    }

    static async get(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = token(req);
        res.json(success(await LeaveService.get(companyId, id, req.params.id)));
    }

    static async myBalances(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = token(req);
        const year = yearOf(req);
        res.json(success({ year, items: await LeaveLedgerService.getBalances(companyId, id, year) }));
    }

    static async userBalances(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = token(req);
        const userId = req.params.userId;
        const year = yearOf(req);
        if (!Types.ObjectId.isValid(userId)) {
            throw new NotFoundError("User not found");
        }
        const [actor, subject] = await Promise.all([loadAccessUser(companyId, id), loadAccessUser(companyId, userId)]);
        if (!subject) {
            throw new NotFoundError("User not found");
        }
        if (!actor || !canReadLeaveBalances(actor, subject)) {
            throw new ForbiddenError("Not allowed to view these balances");
        }
        res.json(success({ year, items: await LeaveLedgerService.getBalances(companyId, userId, year) }));
    }

    static async adjust(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = token(req);
        const body = (req.body ?? {}) as Record<string, unknown>;
        await LeaveLedgerService.adjust(companyId, id, {
            userId: req.params.userId,
            leaveTypeId: String(body.leaveType ?? ""),
            year: String(body.year ?? ""),
            amount: body.amount as number,
            reason: String(body.reason ?? ""),
            effectiveDate: body.effectiveDate === undefined ? undefined : String(body.effectiveDate),
        });
        const year = String(body.year);
        res.status(201).json(
            success({ year, items: await LeaveLedgerService.getBalances(companyId, req.params.userId, year) }),
        );
    }

    /** Posts the yearly grants (idempotent). The same function the operator script runs on 01/01. */
    static async runEntitlements(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = token(req);
        const year = String((req.body ?? {}).year ?? periodOf(todayUtc()));
        const posted = await LeaveLedgerService.ensureEntitlements(companyId, year, { createdBy: id });
        res.json(success({ year, posted }));
    }
}
