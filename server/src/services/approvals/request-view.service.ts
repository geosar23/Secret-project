import { IRequest, RequestStatus } from "../../interfaces/request.interface";
import { canViewRequest } from "../../policies/request.policy";
import { userRepository } from "../../repositories/user.repository";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../utils/app-error.util";
import { loadAccessUser } from "../access-user.service";
import { getRequestType } from "./request-type.registry";
import { ApprovalEngine } from "./request.service";

const STATUSES: RequestStatus[] = ["pending", "approved", "rejected", "canceled"];
const MAX_LIMIT = 100;

export interface Paging {
    page: number;
    limit: number;
    skip: number;
}

export function parsePaging(query: Record<string, unknown>): Paging {
    const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(String(query.limit ?? "20"), 10) || 20));
    return { page, limit, skip: (page - 1) * limit };
}

export function parseStatus(value: unknown): RequestStatus | undefined {
    if (value === undefined || value === "") {
        return undefined;
    }
    if (!STATUSES.includes(value as RequestStatus)) {
        throw new BadRequestError("Unknown status");
    }
    return value as RequestStatus;
}

const parseType = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

type UserRef = { id: string; name: string; email: string };

async function usersById(companyId: string, requests: IRequest[]): Promise<Map<string, UserRef>> {
    const ids = [...new Set(requests.flatMap(r => [String(r.requester), String(r.subject)]))];
    const users = ids.length
        ? await userRepository(companyId)
              .find({ _id: { $in: ids } })
              .select("name email")
              .lean()
        : [];
    return new Map(users.map(u => [String(u._id), { id: String(u._id), name: u.name, email: u.email }]));
}

function summaryOf(request: IRequest) {
    try {
        return getRequestType(request.type).summarize(request);
    } catch {
        return { title: request.type };
    }
}

/** List row: enough for an inbox or "my requests" table without loading the domain record. */
function toListItem(request: IRequest, users: Map<string, UserRef>) {
    const step = request.currentStepIndex === null ? null : request.flow.steps[request.currentStepIndex];
    return {
        id: String(request._id),
        type: request.type,
        status: request.status,
        summary: summaryOf(request),
        requester: users.get(String(request.requester)) ?? { id: String(request.requester) },
        subject: users.get(String(request.subject)) ?? { id: String(request.subject) },
        currentStep: step ? { key: step.key, name: step.name } : null,
        needsRouting: request.needsRouting,
        createdAt: request.createdAt,
        decidedAt: request.decidedAt,
    };
}

async function page(companyId: string, requests: IRequest[], total: number, paging: Paging) {
    const users = await usersById(companyId, requests);
    return {
        items: requests.map(request => toListItem(request, users)),
        total,
        page: paging.page,
        limit: paging.limit,
        totalPages: Math.ceil(total / paging.limit),
    };
}

/** HTTP-facing views over the engine: inbox, "my requests", summary counts and the detail with allowed actions. */
export const RequestViewService = {
    inbox: async (companyId: string, userId: string, query: Record<string, unknown>) => {
        const paging = parsePaging(query);
        const type = parseType(query.type);
        const [requests, total] = await Promise.all([
            ApprovalEngine.listPendingFor(companyId, userId, { type, skip: paging.skip, limit: paging.limit }),
            ApprovalEngine.countPendingForType(companyId, userId, type),
        ]);
        return page(companyId, requests, total, paging);
    },

    mine: async (companyId: string, userId: string, query: Record<string, unknown>) => {
        const paging = parsePaging(query);
        const filter = { type: parseType(query.type), status: parseStatus(query.status) };
        const [requests, total] = await Promise.all([
            ApprovalEngine.listMine(companyId, userId, { ...filter, skip: paging.skip, limit: paging.limit }),
            ApprovalEngine.countMine(companyId, userId, filter),
        ]);
        return page(companyId, requests, total, paging);
    },

    /** One call for login and the home page. Notifications do not exist yet (P0-11G), so the count is 0. */
    summary: async (companyId: string, userId: string) => {
        const [pendingForMe, myPending] = await Promise.all([
            ApprovalEngine.countPendingFor(companyId, userId),
            ApprovalEngine.countMine(companyId, userId, { status: "pending" }),
        ]);
        return { pendingForMe, myPending, unreadNotifications: 0 };
    },

    /** Full request for someone allowed to see it, with the type's detail and what this user may do now. */
    get: async (companyId: string, userId: string, requestId: string) => {
        const request = await ApprovalEngine.get(companyId, requestId).catch(() => {
            throw new NotFoundError("Request not found");
        });
        const [actor, subject] = await Promise.all([
            loadAccessUser(companyId, userId),
            loadAccessUser(companyId, String(request.subject)),
        ]);
        const type = getRequestType(request.type);
        if (!actor || !subject || !canViewRequest(actor, subject, request, type.readCategory)) {
            throw new ForbiddenError("Not allowed to view this request");
        }

        const isPendingApprover = request.pendingApprovers.some(id => String(id) === userId);
        const isSelf = userId === String(request.requester) || userId === String(request.subject);
        const cancellableState =
            request.status === "pending" || (request.status === "approved" && !!type.allowCancelAfterApproval);
        const mayCancel =
            cancellableState &&
            (type.canCancel
                ? await type.canCancel(companyId, { id: userId }, request)
                : userId === String(request.requester));
        const mayDecide =
            request.status === "pending" &&
            isPendingApprover &&
            !isSelf &&
            (await type.canApprove(companyId, { id: userId }, request));

        const users = await usersById(companyId, [request]);
        return {
            ...toListItem(request, users),
            flow: { flowId: request.flow.flowId, version: request.flow.version },
            steps: request.steps.map((state, index) => ({ ...state, name: request.flow.steps[index]?.name })),
            pendingApprovers: request.pendingApprovers.map(String),
            actionsHistory: request.actionsHistory,
            cancelReason: request.cancelReason,
            detail: await type.detail(request),
            can: { decide: mayDecide, cancel: mayCancel },
        };
    },
};
