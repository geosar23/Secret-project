import mongoose from "mongoose";
import request from "supertest";
import app from "../../app";
import { seedUserInCompany, SeededUser } from "../helpers/seed";
import { ApprovalFlowModel } from "../../models/approval-flow.model";
import { RequestModel } from "../../models/request.model";
import { RequestTypeModel } from "../../models/request-type.model";
import { LeaveTypeModel } from "../../models/leave-type.model";
import { LeavePolicyModel } from "../../models/leave-policy.model";
import { WorkScheduleModel } from "../../models/work-schedule.model";
import { LeaveRequestModel } from "../../models/leave-request.model";
import { LeaveLedgerModel } from "../../models/leave-ledger.model";
import { LeaveCompanySettingsModel } from "../../models/leave-company-settings.model";
import { ILeaveBalance } from "../../interfaces/leave.interface";
import { RequestTypeConfigService } from "../../services/approvals/request-type-config.service";
import { LeaveSettingsService } from "../../services/leaves/leave-settings.service";
import { clearRequestTypes } from "../../services/approvals/request-type.registry";
import { registerSystemRequestTypes } from "../../services/approvals/register-request-types";

/** Models use autoIndex:false; the leave ledger's idempotency and the inbox rely on these indexes. */
export const syncLeaveIndexes = () =>
    Promise.all(
        [
            ApprovalFlowModel,
            RequestModel,
            RequestTypeModel,
            LeaveTypeModel,
            LeavePolicyModel,
            WorkScheduleModel,
            LeaveRequestModel,
            LeaveLedgerModel,
            LeaveCompanySettingsModel,
        ].map(model => model.syncIndexes()),
    );

export const EMPLOYEE_PERMISSIONS = ["leaves:read:self", "leaves:write:self", "leaveBalances:read:self"];
export const MANAGER_PERMISSIONS = [
    ...EMPLOYEE_PERMISSIONS,
    "leaves:read:managed",
    "leaves:approve:managed",
    "leaveBalances:read:managed",
    "requests:read:managed",
];
export const HR_PERMISSIONS = ["leaves:*:*", "leaveBalances:*:*", "leaveSettingsManagement:*:*", "requests:read:*"];

/** Next year, so nothing is backdated or already started unless a test makes it so. */
export const YEAR = String(new Date().getUTCFullYear() + 1);

/** YYYY-MM-DD of the first Monday of `month` (1-12) in YEAR, plus `offset` days. */
export function day(month: number, offset = 0): string {
    const first = new Date(Date.UTC(Number(YEAR), month - 1, 1));
    const toMonday = (8 - first.getUTCDay()) % 7;
    return new Date(first.getTime() + (toMonday + offset) * 86_400_000).toISOString().slice(0, 10);
}

export interface LeaveWorld {
    companyId: mongoose.Types.ObjectId;
    hr: SeededUser;
    manager: SeededUser;
    employee: SeededUser;
    colleague: SeededUser; // same company, unrelated to the employee
    leaveTypes: { annual: string; unpaid: string; sick: string };
}

let counter = 0;

/** A company with HR, a manager, their report and an unrelated colleague, plus the default leave setup. */
export async function buildWorld(companyId: mongoose.Types.ObjectId, label = "w"): Promise<LeaveWorld> {
    clearRequestTypes();
    registerSystemRequestTypes();
    const n = ++counter;
    const user = (name: string, permissions: string[], extra: Record<string, unknown> = {}) =>
        seedUserInCompany({
            companyId,
            email: `${label}-${name}-${n}@test.com`,
            name,
            permissions,
            roleKey: `${label}-${name}-${n}`,
            ...extra,
        });

    const hr = await user("hr", HR_PERMISSIONS);
    const manager = await user("manager", MANAGER_PERMISSIONS, { hrRepresentative: hr._id });
    const employee = await user("employee", EMPLOYEE_PERMISSIONS, { manager: manager._id, hrRepresentative: hr._id });
    const colleague = await user("colleague", EMPLOYEE_PERMISSIONS, { hrRepresentative: hr._id });

    const id = String(companyId);
    await RequestTypeConfigService.ensureSystemTypes(id, String(hr._id));
    // Policies effective from last year so both this year and next year resolve
    await LeaveSettingsService.seedDefaults(id, String(hr._id), String(Number(YEAR) - 2));
    const types = await LeaveTypeModel.find({ company: companyId }).lean();
    const byCode = (code: string) => String(types.find(t => t.code === code)!._id);

    return {
        companyId,
        hr,
        manager,
        employee,
        colleague,
        leaveTypes: { annual: byCode("ANNUAL"), unpaid: byCode("UNPAID"), sick: byCode("SICK") },
    };
}

export const auth = (user: SeededUser) => ({ Authorization: `Bearer ${user.token}` });

export const api = {
    createLeave: (user: SeededUser, body: Record<string, unknown>) =>
        request(app).post("/api/leaves").set(auth(user)).send(body),
    decide: (user: SeededUser, requestId: string, decision: "approve" | "reject", comment?: string) =>
        request(app).post(`/api/requests/${requestId}/decision`).set(auth(user)).send({ decision, comment }),
    cancel: (user: SeededUser, requestId: string, reason = "Plans changed") =>
        request(app).post(`/api/requests/${requestId}/cancel`).set(auth(user)).send({ reason }),
    getRequest: (user: SeededUser, requestId: string) => request(app).get(`/api/requests/${requestId}`).set(auth(user)),
    balances: (user: SeededUser, year = YEAR) =>
        request(app).get(`/api/leaves/balances/me?year=${year}`).set(auth(user)),
};

/** Balance row of one leave type from GET /api/leaves/balances/me. */
export async function balanceOf(user: SeededUser, leaveTypeId: string, year = YEAR) {
    const res = await api.balances(user, year);
    expect(res.status).toBe(200);
    const items = res.body.data.items as ILeaveBalance[];
    return items.find(item => item.leaveType.id === leaveTypeId)!;
}
