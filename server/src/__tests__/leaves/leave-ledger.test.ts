/**
 * Leave ledger and entitlements at service level: idempotent effects, yearly grants (option B: stored facts),
 * policy resolution and work schedule resolution.
 */
import mongoose from "mongoose";
import { connectTestDB, disconnectTestDB, clearCollections } from "../helpers/db";
import { COMPANY_A_ID } from "../helpers/seed";
import { LeaveLedgerModel } from "../../models/leave-ledger.model";
import { LeavePolicyModel } from "../../models/leave-policy.model";
import { WorkScheduleModel } from "../../models/work-schedule.model";
import { UserModel } from "../../models/user.model";
import { RequestModel } from "../../models/request.model";
import { CountryModel } from "../../models/country.model";
import { IRequest } from "../../interfaces/request.interface";
import { LeaveLedgerService } from "../../services/leaves/leave-ledger.service";
import { LeavePolicyService } from "../../services/leaves/leave-policy.service";
import { LeaveSettingsService } from "../../services/leaves/leave-settings.service";
import { leaveRequestType } from "../../services/leaves/leave.request-type";
import { BadRequestError } from "../../utils/app-error.util";
import { api, buildWorld, day, LeaveWorld, syncLeaveIndexes, YEAR } from "./fixtures";

const A = COMPANY_A_ID.toString();
let w: LeaveWorld;

const grantsOf = (userId: unknown, leaveType: string, period = YEAR) =>
    LeaveLedgerModel.find({ user: userId, leaveType, period, kind: "grant" }).lean();

beforeAll(async () => {
    await connectTestDB();
    await syncLeaveIndexes();
});

afterAll(async () => {
    await clearCollections();
    await disconnectTestDB();
});

beforeEach(async () => {
    await clearCollections();
    w = await buildWorld(COMPANY_A_ID);
});

describe("idempotent effects", () => {
    it("onApproved and onCanceled post exactly once, however often they run", async () => {
        const res = await api.createLeave(w.employee, {
            leaveType: w.leaveTypes.annual,
            startDate: day(3),
            endDate: day(3, 4),
        });
        const requestId = res.body.data.requestId;
        await api.decide(w.manager, requestId, "approve");
        const approved = (await RequestModel.findById(requestId).lean()) as unknown as IRequest;

        await leaveRequestType.onApproved(approved);
        await leaveRequestType.onApproved(approved);
        expect(await LeaveLedgerModel.countDocuments({ request: requestId, kind: "usage" })).toBe(1);

        await api.cancel(w.employee, requestId);
        const canceled = (await RequestModel.findById(requestId).lean()) as unknown as IRequest;
        await leaveRequestType.onCanceled!(canceled);
        await leaveRequestType.onCanceled!(canceled);
        expect(await LeaveLedgerModel.countDocuments({ request: requestId, kind: "usageReversal" })).toBe(1);
    });

    it("the unique key holds even when the pre-check is bypassed (concurrent posts)", async () => {
        const entry = {
            user: w.employee._id,
            leaveType: new mongoose.Types.ObjectId(w.leaveTypes.annual),
            period: YEAR,
            kind: "usage" as const,
            amount: -1,
            effectiveDate: day(3),
            key: "usage:concurrent:" + YEAR,
            createdBy: "system" as const,
        };
        const results = await Promise.all([LeaveLedgerService.post(A, entry), LeaveLedgerService.post(A, entry)]);
        expect(results.filter(Boolean)).toHaveLength(1);
        expect(await LeaveLedgerModel.countDocuments({ key: entry.key })).toBe(1);
    });
});

describe("entitlements (stored yearly grants)", () => {
    it("are posted once per user, leave type and year; untracked types get none", async () => {
        const first = await LeaveLedgerService.ensureEntitlements(A, YEAR);
        expect(first).toBe(8); // 4 users x (Annual + Unpaid)
        expect(await LeaveLedgerService.ensureEntitlements(A, YEAR)).toBe(0);
        expect(await grantsOf(w.employee._id, w.leaveTypes.annual)).toHaveLength(1);
        expect(await grantsOf(w.employee._id, w.leaveTypes.sick)).toHaveLength(0);
    });

    it("are pro-rated in the hire year", async () => {
        await UserModel.updateOne({ _id: w.employee._id }, { employmentDate: new Date(`${YEAR}-07-02T00:00:00Z`) });
        await LeaveLedgerService.ensureEntitlements(A, YEAR, { userIds: [String(w.employee._id)] });
        const [grant] = await grantsOf(w.employee._id, w.leaveTypes.annual);
        expect(grant.amount).toBe(10);
        expect(grant.effectiveDate).toBe(`${YEAR}-07-02`);
    });

    it("follow the company's hire-year rule; changing it never rewrites grants already posted", async () => {
        const hireDate = new Date(`${YEAR}-07-02T00:00:00Z`);
        await UserModel.updateOne({ _id: w.employee._id }, { employmentDate: hireDate });
        await UserModel.updateOne({ _id: w.colleague._id }, { employmentDate: hireDate });

        await LeaveSettingsService.updateCompanySettings(A, String(w.hr._id), { hireYearEntitlement: "none" });
        await LeaveLedgerService.ensureEntitlements(A, YEAR, { userIds: [String(w.employee._id)] });
        const [none] = await grantsOf(w.employee._id, w.leaveTypes.annual);
        expect(none).toMatchObject({ amount: 0, reason: "Hire year (none)" });

        await LeaveSettingsService.updateCompanySettings(A, String(w.hr._id), { hireYearEntitlement: "full" });
        await LeaveLedgerService.ensureEntitlements(A, YEAR); // on-demand run for everyone
        expect((await grantsOf(w.employee._id, w.leaveTypes.annual)).map(g => g.amount)).toEqual([0]); // unchanged
        expect((await grantsOf(w.colleague._id, w.leaveTypes.annual))[0]).toMatchObject({
            amount: 20,
            reason: "Hire year (full)",
        });
        expect((await LeaveSettingsService.getCompanySettings(A)).hireYearEntitlement).toBe("full");
    });

    it("company settings default to prorated and reject unknown rules", async () => {
        expect((await LeaveSettingsService.getCompanySettings(A)).hireYearEntitlement).toBe("prorated");
        await expect(
            LeaveSettingsService.updateCompanySettings(A, String(w.hr._id), { hireYearEntitlement: "half" }),
        ).rejects.toBeInstanceOf(BadRequestError);
    });

    it("a new policy version never changes a grant already posted; a correction is an adjustment", async () => {
        await LeaveLedgerService.ensureEntitlements(A, YEAR, { userIds: [String(w.employee._id)] });
        await LeaveSettingsService.createPolicyVersion(A, String(w.hr._id), {
            leaveType: w.leaveTypes.annual,
            name: "Annual - company default",
            effectiveFrom: `${YEAR}-01-01`,
            counting: { unit: "workingDays" },
            entitlement: { type: "fixed", amountPerYear: 25 },
        });
        await LeaveLedgerService.ensureEntitlements(A, YEAR, { userIds: [String(w.employee._id)] });
        const grants = await grantsOf(w.employee._id, w.leaveTypes.annual);
        expect(grants.map(g => g.amount)).toEqual([20]);

        await LeaveLedgerService.adjust(A, String(w.hr._id), {
            userId: String(w.employee._id),
            leaveTypeId: w.leaveTypes.annual,
            year: YEAR,
            amount: 5,
            reason: "Policy Annual v2 applied to this year",
        });
        const balances = await LeaveLedgerService.getBalances(A, String(w.employee._id), YEAR);
        expect(balances.find(b => b.leaveType.id === w.leaveTypes.annual)).toMatchObject({
            granted: 20,
            adjusted: 5,
            balance: 25,
        });
        // the next year's grant uses the new version
        const nextYear = String(Number(YEAR) + 1);
        await LeaveLedgerService.ensureEntitlements(A, nextYear, { userIds: [String(w.employee._id)] });
        expect((await grantsOf(w.employee._id, w.leaveTypes.annual, nextYear))[0].amount).toBe(25);
    });

    it("manual adjustments need a reason and a non-zero amount", async () => {
        const base = { userId: String(w.employee._id), leaveTypeId: w.leaveTypes.annual, year: YEAR };
        await expect(
            LeaveLedgerService.adjust(A, String(w.hr._id), { ...base, amount: 2, reason: " " }),
        ).rejects.toBeInstanceOf(BadRequestError);
        await expect(
            LeaveLedgerService.adjust(A, String(w.hr._id), { ...base, amount: 0, reason: "x" }),
        ).rejects.toBeInstanceOf(BadRequestError);
    });
});

describe("policy and schedule resolution", () => {
    it("a country policy beats the company-wide policy", async () => {
        const greece = await CountryModel.create({ company: COMPANY_A_ID, name: "Greece", isActive: true });
        await UserModel.updateOne({ _id: w.employee._id }, { country: greece._id });
        await LeaveSettingsService.createPolicyVersion(A, String(w.hr._id), {
            leaveType: w.leaveTypes.annual,
            name: "Annual - Greece",
            appliesTo: { country: String(greece._id) },
            effectiveFrom: `${Number(YEAR) - 2}-01-01`,
            counting: { unit: "workingDays" },
            entitlement: { type: "fixed", amountPerYear: 25 },
        });

        const policy = await LeavePolicyService.resolvePolicy(A, w.leaveTypes.annual, String(greece._id), day(3));
        expect(policy?.name).toBe("Annual - Greece");
        expect(policy?.version).toBe(1);
        const fallback = await LeavePolicyService.resolvePolicy(A, w.leaveTypes.annual, undefined, day(3));
        expect(fallback?.name).toBe("Annual leave - company default");

        await LeaveLedgerService.ensureEntitlements(A, YEAR, { userIds: [String(w.employee._id)] });
        expect((await grantsOf(w.employee._id, w.leaveTypes.annual))[0].amount).toBe(25);
    });

    it("policy versions are numbered per (leave type, country) scope", async () => {
        const input = {
            leaveType: w.leaveTypes.annual,
            name: "Annual",
            effectiveFrom: `${YEAR}-01-01`,
            counting: { unit: "workingDays" },
            entitlement: { type: "fixed", amountPerYear: 21 },
        };
        const v2 = await LeaveSettingsService.createPolicyVersion(A, String(w.hr._id), input);
        expect(v2.version).toBe(2);
        expect(await LeavePolicyModel.countDocuments({ leaveType: w.leaveTypes.annual })).toBe(2);
    });

    it("work schedule: the user's own, then the country's, then the company default", async () => {
        const country = new mongoose.Types.ObjectId();
        const byCountry = await WorkScheduleModel.create({
            company: COMPANY_A_ID,
            name: "UAE",
            country,
            workingDays: [1, 2, 3, 4, 6],
        });
        const personal = await WorkScheduleModel.create({
            company: COMPANY_A_ID,
            name: "Part time",
            workingDays: [1, 2, 3],
        });

        expect((await LeavePolicyService.resolveSchedule(A, {})).name).toBe("Monday–Friday");
        expect((await LeavePolicyService.resolveSchedule(A, { country })).name).toBe(byCountry.name);
        expect((await LeavePolicyService.resolveSchedule(A, { country, workSchedule: personal._id })).name).toBe(
            "Part time",
        );
    });

    it("the employee's schedule drives the day count", async () => {
        const fridaySundayOff = await WorkScheduleModel.create({
            company: COMPANY_A_ID,
            name: "Fri+Sun off",
            workingDays: [1, 2, 3, 4, 6],
        });
        await UserModel.updateOne({ _id: w.employee._id }, { workSchedule: fridaySundayOff._id });
        // Monday to Sunday: Mon-Thu + Sat = 5 working days
        const res = await api.createLeave(w.employee, {
            leaveType: w.leaveTypes.annual,
            startDate: day(3),
            endDate: day(3, 6),
        });
        expect(res.status).toBe(201);
        const request = await RequestModel.findById(res.body.data.requestId).lean();
        expect((request!.payload as { quantity: number }).quantity).toBe(5);
    });
});
