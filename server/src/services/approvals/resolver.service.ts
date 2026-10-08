import { ApproverResolver, IFlowStep } from "../../interfaces/approval-flow.interface";
import { RequestTypeDefinition } from "../../interfaces/request-type.interface";
import { userRepository } from "../../repositories/user.repository";
import { BadRequestError } from "../../utils/app-error.util";

export interface ResolutionContext {
    companyId: string;
    requesterId: string;
    subjectId: string;
    type: RequestTypeDefinition<unknown>;
    at?: Date;
}

export interface Resolution {
    userIds: string[];
    resolvedFrom?: ApproverResolver;
    /** The step was skipped because the requester would have approved their own request. */
    skipped: boolean;
    needsRouting: boolean;
}

/** Raw candidates for one resolver, before activity, availability and self-approval filtering. */
async function candidatesFor(resolver: ApproverResolver, ctx: ResolutionContext): Promise<string[]> {
    const users = userRepository(ctx.companyId);

    switch (resolver.kind) {
        case "lineManager": {
            const subject = await users.findById(ctx.subjectId).select("manager").lean();
            return subject?.manager ? [String(subject.manager)] : [];
        }
        case "hrRepresentative": {
            const subject = await users.findById(ctx.subjectId).select("hrRepresentative").lean();
            return subject?.hrRepresentative ? [String(subject.hrRepresentative)] : [];
        }
        case "role": {
            const holders = await users.find({ role: resolver.roleId, isActive: true }).select("_id").lean();
            return holders.map(user => String(user._id));
        }
        case "user":
            return [String(resolver.userId)];
        default:
            throw new BadRequestError(`Approver resolver "${resolver.kind}" is not supported yet`);
    }
}

async function usableOnly(userIds: string[], ctx: ResolutionContext): Promise<string[]> {
    if (!userIds.length) {
        return [];
    }
    const active = await userRepository(ctx.companyId)
        .find({ _id: { $in: userIds }, isActive: true })
        .select("_id")
        .lean();
    const activeIds = active.map(user => String(user._id));

    if (!ctx.type.isUnavailable) {
        return activeIds;
    }
    const at = ctx.at ?? new Date();
    const available: string[] = [];
    for (const id of activeIds) {
        if (!(await ctx.type.isUnavailable(ctx.companyId, id, at))) {
            available.push(id);
        }
    }
    return available;
}

const isSelf = (userId: string, ctx: ResolutionContext) => userId === ctx.requesterId || userId === ctx.subjectId;

/**
 * Turns a step rule into concrete approvers: resolver, then fallback, never the requester or subject.
 * Returns needsRouting instead of approving silently when nobody can be found.
 */
export async function resolveApprovers(step: IFlowStep, ctx: ResolutionContext): Promise<Resolution> {
    const primary = await usableOnly(await candidatesFor(step.resolver, ctx), ctx);
    const primaryOthers = primary.filter(id => !isSelf(id, ctx));
    if (primaryOthers.length) {
        return { userIds: primaryOthers, resolvedFrom: step.resolver, skipped: false, needsRouting: false };
    }

    if (primary.length && step.skipIfRequesterIsApprover) {
        return { userIds: [], resolvedFrom: step.resolver, skipped: true, needsRouting: false };
    }

    if (step.fallback) {
        const fallback = (await usableOnly(await candidatesFor(step.fallback, ctx), ctx)).filter(
            id => !isSelf(id, ctx),
        );
        if (fallback.length) {
            return { userIds: fallback, resolvedFrom: step.fallback, skipped: false, needsRouting: false };
        }
    }

    return { userIds: [], skipped: false, needsRouting: true };
}
