import { Types } from "mongoose";
import { IApprovalFlow, IFlowScope, IFlowStep } from "../../interfaces/approval-flow.interface";
import { approvalFlowRepository } from "../../repositories/approval-flow.repository";
import { BadRequestError, ConflictError } from "../../utils/app-error.util";
import { getRequestType } from "./request-type.registry";

export interface ResolvedFlow {
    flowId?: Types.ObjectId;
    version: number;
    steps: IFlowStep[];
}

type ScopeKey = keyof IFlowScope;

// Tie-break when two flows specify the same number of dimensions (P0-11A: pending confirmation).
const SCOPE_PRIORITY: ScopeKey[] = ["leaveType", "department", "country"];

const sameId = (a?: Types.ObjectId | string, b?: Types.ObjectId | string) => !!a && !!b && String(a) === String(b);

function specifiedKeys(scope?: IFlowScope): ScopeKey[] {
    return SCOPE_PRIORITY.filter(key => !!scope?.[key]);
}

/** A flow matches only if every dimension it specifies equals the request's value. */
export function flowMatches(flow: Pick<IApprovalFlow, "scope">, requestScope: IFlowScope): boolean {
    return specifiedKeys(flow.scope).every(key => sameId(flow.scope?.[key], requestScope[key]));
}

/** Positive when `a` is more specific than `b`: more dimensions first, then fixed dimension priority. */
export function compareSpecificity(a: Pick<IApprovalFlow, "scope">, b: Pick<IApprovalFlow, "scope">): number {
    const keysA = specifiedKeys(a.scope);
    const keysB = specifiedKeys(b.scope);
    if (keysA.length !== keysB.length) {
        return keysA.length - keysB.length;
    }
    for (const key of SCOPE_PRIORITY) {
        const hasA = keysA.includes(key);
        const hasB = keysB.includes(key);
        if (hasA !== hasB) {
            return hasA ? 1 : -1;
        }
    }
    return 0;
}

export function validateSteps(steps: IFlowStep[]): void {
    if (!steps?.length) {
        throw new BadRequestError("A flow needs at least one step");
    }
    const keys = new Set<string>();
    for (const step of steps) {
        if (keys.has(step.key)) {
            throw new BadRequestError(`Duplicate step key "${step.key}"`);
        }
        keys.add(step.key);
    }
}

export const FlowService = {
    /**
     * Most specific active flow (latest version) for the scope. Every company has a stored company-wide flow per
     * request type (seeded from the type's template), so no match means a configuration error: creation is refused.
     */
    resolve: async (companyId: string, type: string, scope: IFlowScope = {}): Promise<ResolvedFlow> => {
        const candidates = await approvalFlowRepository(companyId).find({ requestType: type, isActive: true }).lean();
        const matching = candidates.filter(flow => flowMatches(flow, scope));

        const best = matching.sort((a, b) => compareSpecificity(b, a) || b.version - a.version)[0];

        if (!best) {
            throw new BadRequestError(`No approval flow configured for "${type}"`);
        }
        return { flowId: best._id, version: best.version, steps: best.steps };
    },

    /** Seeds the company-wide flow (version 1) from the type's template, unless the type already has any flow. */
    ensureDefault: async (companyId: string, type: string, createdBy: string): Promise<boolean> => {
        const repo = approvalFlowRepository(companyId);
        if (await repo.count({ requestType: type })) {
            return false;
        }
        await FlowService.createVersion(companyId, {
            requestType: type,
            steps: getRequestType(type).flowTemplate,
            createdBy,
        });
        return true;
    },

    /** Saves a new version for the exact scope and deactivates the previous ones. In-flight requests keep their frozen copy. */
    createVersion: async (
        companyId: string,
        input: { requestType: string; scope?: IFlowScope; steps: IFlowStep[]; createdBy: string },
    ) => {
        validateSteps(input.steps);
        getRequestType(input.requestType);

        const repo = approvalFlowRepository(companyId);
        const sameScope = {
            requestType: input.requestType,
            "scope.country": input.scope?.country ?? null,
            "scope.department": input.scope?.department ?? null,
            "scope.leaveType": input.scope?.leaveType ?? null,
        };
        const previous = await repo.find(sameScope).sort({ version: -1 }).limit(1).lean();
        const version = (previous[0]?.version ?? 0) + 1;

        try {
            await repo.updateMany(sameScope, { isActive: false });
            return await repo.create({
                requestType: input.requestType,
                scope: input.scope,
                version,
                isActive: true,
                steps: input.steps,
                createdBy: new Types.ObjectId(input.createdBy),
            });
        } catch (error) {
            if ((error as { code?: number }).code === 11000) {
                throw new ConflictError("A flow with this scope and version already exists");
            }
            throw error;
        }
    },
};
