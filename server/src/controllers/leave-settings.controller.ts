import { Response } from "express";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { LeaveSettingsService } from "../services/leaves/leave-settings.service";
import { success } from "../utils/response.util";

const companyOf = (req: AuthenticatedRequest) => (req.decoded as tokenPayload).companyId;

/** Company leave settings, leave types, policy versions and work schedules. Routes are guarded by leaveSettingsManagement. */
export class LeaveSettingsController {
    static async getCompanySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
        res.json(success(await LeaveSettingsService.getCompanySettings(companyOf(req))));
    }

    static async updateCompanySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = req.decoded as tokenPayload;
        res.json(success(await LeaveSettingsService.updateCompanySettings(companyId, id, req.body)));
    }

    static async listLeaveTypes(req: AuthenticatedRequest, res: Response): Promise<void> {
        res.json(success(await LeaveSettingsService.listLeaveTypes(companyOf(req))));
    }

    static async createLeaveType(req: AuthenticatedRequest, res: Response): Promise<void> {
        res.status(201).json(success(await LeaveSettingsService.createLeaveType(companyOf(req), req.body)));
    }

    static async updateLeaveType(req: AuthenticatedRequest, res: Response): Promise<void> {
        res.json(success(await LeaveSettingsService.updateLeaveType(companyOf(req), req.params.id, req.body)));
    }

    static async listPolicies(req: AuthenticatedRequest, res: Response): Promise<void> {
        const leaveType = typeof req.query.leaveType === "string" ? req.query.leaveType : undefined;
        res.json(success(await LeaveSettingsService.listPolicies(companyOf(req), leaveType)));
    }

    static async createPolicyVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { id, companyId } = req.decoded as tokenPayload;
        res.status(201).json(success(await LeaveSettingsService.createPolicyVersion(companyId, id, req.body)));
    }

    static async listWorkSchedules(req: AuthenticatedRequest, res: Response): Promise<void> {
        res.json(success(await LeaveSettingsService.listWorkSchedules(companyOf(req))));
    }

    static async createWorkSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
        res.status(201).json(success(await LeaveSettingsService.createWorkSchedule(companyOf(req), req.body)));
    }

    static async updateWorkSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
        res.json(success(await LeaveSettingsService.updateWorkSchedule(companyOf(req), req.params.id, req.body)));
    }
}
