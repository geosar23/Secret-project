import { Types } from "mongoose";
import { IRequest, RequestStatus } from "../../interfaces/request.interface";
import { IUser } from "../../interfaces/user.interface";
import { PermissionActions, PermissionCategories, PermissionScopes } from "../../enums/permissions.enum";
import { canViewRequest, hasScopedAccess } from "../../policies/request.policy";
import { buildSearchAccessQuery } from "../../policies/search-access.policy";
import { userRepository } from "../../repositories/user.repository";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../utils/app-error.util";
import { loadAccessUser } from "../access-user.service";
import { getRequestType, listRequestTypes } from "./request-type.registry";
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

/** Status filter of the Requests page: a real status, or `needsRouting` (pending with nobody to approve). */
function parseStatusFilter(value: unknown): { status?: RequestStatus; needsRouting?: boolean } {
    return value === "needsRouting" ? { needsRouting: true } : { status: parseStatus(value) };
}

/** type, status, needs-routing and submitted-between filters read from the query string. */
function parseListFilter(query: Record<string, unknown>) {
    return {
        type: parseType(query.type),
        ...parseStatusFilter(query.status),
        createdFrom: parseDate(query.from, "from", false),
        createdTo: parseDate(query.to, "to", true),
    };
}

/** `YYYY-MM-DD` day bound; an end bound covers the whole day. */
function parseDate(value: unknown, name: string, endOfDay: boolean): Date | undefined {
    if (value === undefined || value === "") {
        return undefined;
    }
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new BadRequestError(`${name} must be a YYYY-MM-DD date`);
    }
    const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
    if (Number.isNaN(date.getTime())) {
        throw new BadRequestError(`${name} must be a valid date`);
    }
    return date;
}

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

/** Names for everyone who appears in the timeline or waits on the request, so the UI can label each step. */
async function peopleIn(
    companyId: string,
    request: IRequest,
    known: Map<string, UserRef>,
): Promise<Map<string, UserRef>> {
    const wanted = new Set<string>([
        ...request.pendingApprovers.map(String),
        ...request.actionsHistory.map(entry => String(entry.user)).filter(id => Types.ObjectId.isValid(id)),
        ...request.actionsHistory.flatMap(entry =>
            Array.isArray(entry.data?.assignees) ? (entry.data.assignees as unknown[]).map(String) : [],
        ),
    ]);
    const missing = [...wanted].filter(id => !known.has(id));
    const found = missing.length
        ? await userRepository(companyId)
              .find({ _id: { $in: missing } })
              .select("name email")
              .lean()
        : [];
    const people = new Map(known);
    for (const user of found) {
        people.set(String(user._id), { id: String(user._id), name: user.name, email: user.email });
    }
    return people;
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

const scopedKey = (category: PermissionCategories, scope: PermissionScopes) =>
    `${category}:${PermissionActions.READ}:${scope}`;

/**
 * Mongo clauses (`$or`) selecting the requests about other people that the actor may read, one clause per readable
 * category: `requests` covers every type, a type's own read category covers that type. Empty when the actor can read
 * none. The `self` scope is left out on purpose, so a viewer's own requests stay in "My requests".
 */
async function teamAccess(companyId: string, userId: string): Promise<Record<string, unknown>[]> {
    const actor = await loadAccessUser(companyId, userId);
    if (!actor) {
        return [];
    }
    const sources = [
        { category: PermissionCategories.REQUESTS, type: undefined as string | undefined },
        ...listRequestTypes()
            .filter(type => !!type.readCategory)
            .map(type => ({ category: type.readCategory as PermissionCategories, type: type.type })),
    ];

    const clauses: Record<string, unknown>[] = [];
    for (const { category, type } of sources) {
        const userFilter = buildSearchAccessQuery<IUser>(actor, {
            permissions: {
                all: scopedKey(category, PermissionScopes.ALL),
                readAll: scopedKey(category, PermissionScopes.ALL),
                readDepartment: scopedKey(category, PermissionScopes.DEPARTMENT),
                readCountry: scopedKey(category, PermissionScopes.COUNTRY),
                readDepartmentCountry: scopedKey(category, PermissionScopes.DEPARTMENT_COUNTRY),
                readManaged: scopedKey(category, PermissionScopes.MANAGED),
            },
            fields: {
                department: ["primaryDepartment", "secondaryDepartments"],
                country: "country",
                manager: "manager",
                id: "_id",
            },
        });
        if (!userFilter) {
            continue;
        }
        const typeClause = type ? { type } : {};
        if (Object.keys(userFilter).length === 0) {
            clauses.push({ ...typeClause, subject: { $ne: userId } });
            continue;
        }
        const people = await userRepository(companyId)
            .find({ $and: [userFilter, { _id: { $ne: userId } }] })
            .select("_id")
            .lean();
        if (people.length) {
            clauses.push({ ...typeClause, subject: { $in: people.map(person => person._id) } });
        }
    }
    return clauses;
}

/** HTTP-facing views over the engine: inbox, "my requests", summary counts and the detail with allowed actions. */
export const RequestViewService = {
    inbox: async (companyId: string, userId: string, query: Record<string, unknown>) => {
        const paging = parsePaging(query);
        // Everything in the inbox is pending, so a status filter other than "needs routing" does not apply.
        const { type, needsRouting, createdFrom, createdTo } = parseListFilter(query);
        const filter = { type, needsRouting, createdFrom, createdTo };
        const [requests, total] = await Promise.all([
            ApprovalEngine.listPendingFor(companyId, userId, { ...filter, skip: paging.skip, limit: paging.limit }),
            ApprovalEngine.countPendingForType(companyId, userId, filter),
        ]);
        return page(companyId, requests, total, paging);
    },

    mine: async (companyId: string, userId: string, query: Record<string, unknown>) => {
        const paging = parsePaging(query);
        const filter = parseListFilter(query);
        const [requests, total] = await Promise.all([
            ApprovalEngine.listMine(companyId, userId, { ...filter, skip: paging.skip, limit: paging.limit }),
            ApprovalEngine.countMine(companyId, userId, filter),
        ]);
        return page(companyId, requests, total, paging);
    },

    /**
     * Requests about other people the viewer may read: `requests:read` (any type) or a type's own read permission
     * (for leave: `leaves:read`), each within its scope. Own requests are not here, they live in "My requests".
     * Someone with no such permission gets an empty list, not an error, so the tab can simply be hidden.
     */
    team: async (companyId: string, userId: string, query: Record<string, unknown>) => {
        const paging = parsePaging(query);
        const access = await teamAccess(companyId, userId);
        if (!access.length) {
            return page(companyId, [], 0, paging);
        }
        const filter = { ...parseListFilter(query), access };
        const [requests, total] = await Promise.all([
            ApprovalEngine.listTeam(companyId, { ...filter, skip: paging.skip, limit: paging.limit }),
            ApprovalEngine.countTeam(companyId, filter),
        ]);
        return page(companyId, requests, total, paging);
    },

    /**
     * Requests about one employee (their profile tab). Yourself: all types. Someone else: only the types the actor may
     * read for that person (`requests:read` or the type's own read permission), so nothing leaks through the filter.
     */
    about: async (companyId: string, actorId: string, subjectId: string, query: Record<string, unknown>) => {
        const [actor, subject] = await Promise.all([
            loadAccessUser(companyId, actorId),
            Types.ObjectId.isValid(subjectId) ? loadAccessUser(companyId, subjectId) : null,
        ]);
        if (!subject) {
            throw new NotFoundError("User not found");
        }
        if (!actor) {
            throw new ForbiddenError("Not allowed to view these requests");
        }

        let types: string[] | undefined;
        if (actorId !== subjectId) {
            const canReadAll = hasScopedAccess(actor, subject, PermissionCategories.REQUESTS, PermissionActions.READ, {
                beyondSelf: true,
            });
            types = listRequestTypes()
                .filter(
                    type =>
                        canReadAll ||
                        (!!type.readCategory &&
                            hasScopedAccess(actor, subject, type.readCategory, PermissionActions.READ, {
                                beyondSelf: true,
                            })),
                )
                .map(type => type.type);
            if (!types.length) {
                throw new ForbiddenError("Not allowed to view these requests");
            }
        }

        const paging = parsePaging(query);
        const filter = {
            types,
            type: parseType(query.type),
            status: parseStatus(query.status),
            createdFrom: parseDate(query.from, "from", false),
            createdTo: parseDate(query.to, "to", true),
        };
        const [requests, total] = await Promise.all([
            ApprovalEngine.listAbout(companyId, subjectId, { ...filter, skip: paging.skip, limit: paging.limit }),
            ApprovalEngine.countAbout(companyId, subjectId, filter),
        ]);
        return page(companyId, requests, total, paging);
    },

    /**
     * One call for login, the home page and the Requests page cards. `needsRouting` counts the requests the viewer
     * may read that are stuck without an approver; `hasTeam` tells the client whether to show the Team tab.
     * Notifications do not exist yet (P0-11G), so that count is 0.
     */
    summary: async (companyId: string, userId: string) => {
        const access = await teamAccess(companyId, userId);
        const [pendingForMe, myPending, oldestPendingForMe, needsRouting] = await Promise.all([
            ApprovalEngine.countPendingFor(companyId, userId),
            ApprovalEngine.countMine(companyId, userId, { status: "pending" }),
            ApprovalEngine.oldestPendingFor(companyId, userId),
            access.length ? ApprovalEngine.countNeedingRouting(companyId, access) : 0,
        ]);
        return {
            pendingForMe,
            myPending,
            oldestPendingForMe,
            needsRouting,
            hasTeam: access.length > 0,
            unreadNotifications: 0,
        };
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
        const people = await peopleIn(companyId, request, users);
        return {
            ...toListItem(request, users),
            flow: { flowId: request.flow.flowId, version: request.flow.version },
            steps: request.steps.map((state, index) => ({ ...state, name: request.flow.steps[index]?.name })),
            pendingApprovers: request.pendingApprovers.map(String),
            actionsHistory: request.actionsHistory,
            people: Object.fromEntries(people),
            cancelReason: request.cancelReason,
            detail: await type.detail(request),
            can: { decide: mayDecide, cancel: mayCancel },
        };
    },
};
