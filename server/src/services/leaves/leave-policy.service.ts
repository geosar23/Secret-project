import { ILeavePolicy, IWorkSchedule } from "../../interfaces/leave.interface";
import { leavePolicyRepository } from "../../repositories/leave-policy.repository";
import { workScheduleRepository } from "../../repositories/work-schedule.repository";
import { RuleViolationError } from "../../utils/app-error.util";

const idOf = (value: unknown) => (value ? String((value as { _id?: unknown })._id ?? value) : undefined);

/**
 * Picks the policy for one leave type on one date from preloaded versions: effective on the date, a country match
 * beats the company-wide policy, then the latest `effectiveFrom`, then the highest version.
 */
export function pickPolicy(
    policies: ILeavePolicy[],
    leaveTypeId: string,
    countryId: string | undefined,
    date: string,
): ILeavePolicy | null {
    const candidates = policies.filter(policy => {
        const policyCountry = idOf(policy.appliesTo?.country);
        return (
            String(policy.leaveType) === leaveTypeId &&
            policy.effectiveFrom <= date &&
            (!policyCountry || policyCountry === countryId)
        );
    });
    const rank = (policy: ILeavePolicy) => (policy.appliesTo?.country ? 1 : 0);
    candidates.sort(
        (a, b) =>
            rank(b) - rank(a) || b.effectiveFrom.localeCompare(a.effectiveFrom) || (b.version ?? 0) - (a.version ?? 0),
    );
    return candidates[0] ?? null;
}

export const LeavePolicyService = {
    loadPolicies: async (companyId: string, leaveTypeIds?: string[]) =>
        (await leavePolicyRepository(companyId)
            .find(leaveTypeIds ? { leaveType: { $in: leaveTypeIds } } : {})
            .lean()) as unknown as ILeavePolicy[],

    resolvePolicy: async (companyId: string, leaveTypeId: string, countryId: string | undefined, date: string) =>
        pickPolicy(await LeavePolicyService.loadPolicies(companyId, [leaveTypeId]), leaveTypeId, countryId, date),

    /** The user's own schedule, else their country's, else the company default. */
    resolveSchedule: async (
        companyId: string,
        user: { workSchedule?: unknown; country?: unknown },
    ): Promise<IWorkSchedule> => {
        const repo = workScheduleRepository(companyId);
        const own = idOf(user.workSchedule);
        const country = idOf(user.country);
        const schedule =
            (own && (await repo.findById(own).lean())) ||
            (country && (await repo.findOne({ country }).sort({ createdAt: 1 }).lean())) ||
            (await repo.findOne({ isDefault: true }).sort({ createdAt: 1 }).lean());
        if (!schedule) {
            throw new RuleViolationError("noWorkSchedule", "No work schedule is configured for this employee");
        }
        return schedule as unknown as IWorkSchedule;
    },
};
