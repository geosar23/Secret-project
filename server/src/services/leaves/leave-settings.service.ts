import { Types } from "mongoose";
import {
    HireYearEntitlement,
    ILeaveCompanySettings,
    ILeavePolicy,
    ILeaveType,
    IWorkSchedule,
    LeaveEntitlement,
} from "../../interfaces/leave.interface";
import { countryRepository } from "../../repositories/country.repository";
import { leaveCompanySettingsRepository } from "../../repositories/leave-company-settings.repository";
import { leavePolicyRepository } from "../../repositories/leave-policy.repository";
import { leaveTypeRepository } from "../../repositories/leave-type.repository";
import { workScheduleRepository } from "../../repositories/work-schedule.repository";
import { BadRequestError, ConflictError, NotFoundError } from "../../utils/app-error.util";
import { isIsoDate } from "./leave-calculator";

type Body = Record<string, unknown>;
const asBody = (value: unknown): Body => (typeof value === "object" && value !== null ? (value as Body) : {});
const isId = (value: unknown): value is string => typeof value === "string" && Types.ObjectId.isValid(value);
const isDuplicateKey = (error: unknown) => (error as { code?: number }).code === 11000;

function requiredText(value: unknown, field: string): string {
    if (typeof value !== "string" || !value.trim()) {
        throw new BadRequestError(`${field} is required`);
    }
    return value.trim();
}

function parseWorkingDays(value: unknown): number[] {
    if (
        !Array.isArray(value) ||
        !value.length ||
        new Set(value).size !== value.length ||
        !value.every(day => Number.isInteger(day) && day >= 0 && day <= 6)
    ) {
        throw new BadRequestError("workingDays must be distinct weekdays between 0 (Sunday) and 6 (Saturday)");
    }
    return [...value].sort();
}

async function assertCountry(companyId: string, countryId: unknown): Promise<Types.ObjectId | undefined> {
    if (countryId === undefined || countryId === null || countryId === "") {
        return undefined;
    }
    if (!isId(countryId) || !(await countryRepository(companyId).findById(countryId).select("_id").lean())) {
        throw new BadRequestError("Unknown country");
    }
    return new Types.ObjectId(countryId);
}

function parseEntitlement(value: unknown): LeaveEntitlement {
    const e = asBody(value);
    if (e.type === "none") {
        return { type: "none" };
    }
    if (e.type === "fixed" && typeof e.amountPerYear === "number" && e.amountPerYear >= 0) {
        return { type: "fixed", amountPerYear: e.amountPerYear };
    }
    throw new BadRequestError('entitlement must be { type: "none" } or { type: "fixed", amountPerYear >= 0 }');
}

/** Starter configuration for a new company: Annual 20 days, Unpaid 30 days, Sick untracked; Monday–Friday. */
const DEFAULT_LEAVE_TYPES: {
    name: string;
    code: string;
    color: string;
    entitlement: LeaveEntitlement;
    allowBackdated: boolean;
}[] = [
    {
        name: "Annual leave",
        code: "ANNUAL",
        color: "#2e7d32",
        entitlement: { type: "fixed", amountPerYear: 20 },
        allowBackdated: false,
    },
    {
        name: "Unpaid leave",
        code: "UNPAID",
        color: "#757575",
        entitlement: { type: "fixed", amountPerYear: 30 },
        allowBackdated: false,
    },
    { name: "Sick leave", code: "SICK", color: "#c62828", entitlement: { type: "none" }, allowBackdated: true },
];

const HIRE_YEAR_RULES: HireYearEntitlement[] = ["prorated", "full", "none"];
const DEFAULT_COMPANY_SETTINGS = { hireYearEntitlement: "prorated" as HireYearEntitlement };

export const LeaveSettingsService = {
    /** The company's leave settings; defaults apply until HR saves them. */
    getCompanySettings: async (companyId: string) => {
        const stored = await leaveCompanySettingsRepository(companyId).findOne().lean();
        return { ...DEFAULT_COMPANY_SETTINGS, ...(stored ?? {}) } as ILeaveCompanySettings;
    },

    /** Changes apply to grants posted from now on; grants already in the ledger are never rewritten. */
    updateCompanySettings: async (companyId: string, actorId: string, body: unknown) => {
        const b = asBody(body);
        if (!HIRE_YEAR_RULES.includes(b.hireYearEntitlement as HireYearEntitlement)) {
            throw new BadRequestError(`hireYearEntitlement must be one of ${HIRE_YEAR_RULES.join(", ")}`);
        }
        await leaveCompanySettingsRepository(companyId).findOneAndUpdate(
            {},
            { $set: { hireYearEntitlement: b.hireYearEntitlement, updatedBy: new Types.ObjectId(actorId) } },
            { upsert: true },
        );
        return LeaveSettingsService.getCompanySettings(companyId);
    },

    /**
     * Idempotent: creates the default work schedule and the default leave types with a company-wide policy (version 1,
     * effective from 01/01 of `year`) when the company has none of them yet. Existing configuration is never changed.
     */
    seedDefaults: async (companyId: string, createdBy: string, year: string) => {
        const schedules = workScheduleRepository(companyId);
        if (!(await schedules.count({ isDefault: true }))) {
            await schedules.create({ name: "Monday–Friday", workingDays: [1, 2, 3, 4, 5], isDefault: true });
        }
        const types = leaveTypeRepository(companyId);
        const policies = leavePolicyRepository(companyId);
        for (const def of DEFAULT_LEAVE_TYPES) {
            const existing = await types.findOne({ code: def.code }).select("_id").lean();
            if (existing) {
                continue;
            }
            const type = await types.create({ name: def.name, code: def.code, color: def.color, isActive: true });
            await policies.create({
                leaveType: type._id as Types.ObjectId,
                name: `${def.name} - company default`,
                appliesTo: {},
                effectiveFrom: `${year}-01-01`,
                version: 1,
                counting: { unit: "workingDays" },
                entitlement: def.entitlement,
                negativeBalance: { allowed: def.entitlement.type === "none" },
                requestRules: { allowBackdated: def.allowBackdated },
                createdBy: new Types.ObjectId(createdBy),
            } as Partial<ILeavePolicy>);
        }
    },

    // ─── Leave types ────────────────────────────────────────────────────────

    listLeaveTypes: (companyId: string) => leaveTypeRepository(companyId).find().sort({ name: 1 }).lean(),

    createLeaveType: async (companyId: string, body: unknown) => {
        const b = asBody(body);
        try {
            return await leaveTypeRepository(companyId).create({
                name: requiredText(b.name, "name"),
                code: requiredText(b.code, "code").toUpperCase(),
                color: typeof b.color === "string" ? b.color.trim() : undefined,
                isActive: b.isActive !== false,
            } as Partial<ILeaveType>);
        } catch (error) {
            if (isDuplicateKey(error)) {
                throw new ConflictError("A leave type with this code already exists");
            }
            throw error;
        }
    },

    /** Name, colour and active flag only: the code is a stable identifier. */
    updateLeaveType: async (companyId: string, id: string, body: unknown) => {
        const b = asBody(body);
        const patch: Partial<ILeaveType> = {};
        if (b.name !== undefined) {
            patch.name = requiredText(b.name, "name");
        }
        if (b.color !== undefined) {
            patch.color = typeof b.color === "string" ? b.color.trim() : undefined;
        }
        if (b.isActive !== undefined) {
            patch.isActive = b.isActive === true;
        }
        const repo = leaveTypeRepository(companyId);
        if (!isId(id) || !(await repo.findById(id).select("_id").lean())) {
            throw new NotFoundError("Leave type not found");
        }
        await repo.updateOne({ _id: id }, patch);
        return repo.findById(id).lean();
    },

    // ─── Policies (append-only versions) ───────────────────────────────────

    listPolicies: (companyId: string, leaveTypeId?: string) =>
        leavePolicyRepository(companyId)
            .find(isId(leaveTypeId) ? { leaveType: leaveTypeId } : {})
            .sort({ leaveType: 1, effectiveFrom: -1, version: -1 })
            .lean(),

    /** Creates the next version for the (leave type, country) scope. Earlier versions are never changed. */
    createPolicyVersion: async (companyId: string, actorId: string, body: unknown) => {
        const b = asBody(body);
        if (!isId(b.leaveType) || !(await leaveTypeRepository(companyId).findById(b.leaveType).select("_id").lean())) {
            throw new BadRequestError("Unknown leave type");
        }
        if (!isIsoDate(b.effectiveFrom)) {
            throw new BadRequestError("effectiveFrom must be YYYY-MM-DD");
        }
        const unit = asBody(b.counting).unit;
        if (unit !== "workingDays" && unit !== "calendarDays") {
            throw new BadRequestError('counting.unit must be "workingDays" or "calendarDays"');
        }
        const negative = asBody(b.negativeBalance);
        const maxAmount = negative.maxAmount;
        if (maxAmount !== undefined && maxAmount !== null && !(typeof maxAmount === "number" && maxAmount >= 0)) {
            throw new BadRequestError("negativeBalance.maxAmount must be a number >= 0");
        }
        const country = await assertCountry(companyId, asBody(b.appliesTo).country);

        const repo = leavePolicyRepository(companyId);
        const scope = { leaveType: b.leaveType, "appliesTo.country": country ?? null };
        const latest = await repo.find(scope).sort({ version: -1 }).limit(1).lean();
        try {
            return await repo.create({
                leaveType: new Types.ObjectId(b.leaveType),
                name: requiredText(b.name, "name"),
                appliesTo: country ? { country } : {},
                effectiveFrom: b.effectiveFrom,
                version: (latest[0]?.version ?? 0) + 1,
                counting: { unit },
                entitlement: parseEntitlement(b.entitlement),
                negativeBalance: {
                    allowed: negative.allowed === true,
                    ...(typeof maxAmount === "number" ? { maxAmount } : {}),
                },
                requestRules: { allowBackdated: asBody(b.requestRules).allowBackdated === true },
                createdBy: new Types.ObjectId(actorId),
            } as Partial<ILeavePolicy>);
        } catch (error) {
            if (isDuplicateKey(error)) {
                throw new ConflictError("A policy version was created at the same time, try again");
            }
            throw error;
        }
    },

    // ─── Work schedules ────────────────────────────────────────────────────

    listWorkSchedules: (companyId: string) => workScheduleRepository(companyId).find().sort({ name: 1 }).lean(),

    createWorkSchedule: async (companyId: string, body: unknown) => {
        const b = asBody(body);
        const schedule = {
            name: requiredText(b.name, "name"),
            country: await assertCountry(companyId, b.country),
            workingDays: parseWorkingDays(b.workingDays),
            isDefault: b.isDefault === true,
        } as Partial<IWorkSchedule>;
        const repo = workScheduleRepository(companyId);
        if (schedule.isDefault) {
            await repo.updateMany({ isDefault: true }, { isDefault: false });
        }
        return repo.create(schedule);
    },

    updateWorkSchedule: async (companyId: string, id: string, body: unknown) => {
        const b = asBody(body);
        const repo = workScheduleRepository(companyId);
        if (!isId(id) || !(await repo.findById(id).select("_id").lean())) {
            throw new NotFoundError("Work schedule not found");
        }
        const patch: Partial<IWorkSchedule> = {};
        if (b.name !== undefined) {
            patch.name = requiredText(b.name, "name");
        }
        if (b.workingDays !== undefined) {
            patch.workingDays = parseWorkingDays(b.workingDays);
        }
        if (b.country !== undefined) {
            patch.country = await assertCountry(companyId, b.country);
        }
        if (b.isDefault !== undefined) {
            patch.isDefault = b.isDefault === true;
            if (patch.isDefault) {
                await repo.updateMany({ isDefault: true, _id: { $ne: id } }, { isDefault: false });
            }
        }
        await repo.updateOne({ _id: id }, patch);
        return repo.findById(id).lean();
    },
};
