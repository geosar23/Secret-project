import { Router } from "express";
import { LeaveSettingsController as LeaveSettingsControllerRaw } from "../controllers/leave-settings.controller";
import { PermissionKeys } from "../enums/permissions.enum";
import { userHasPermission } from "../middleware/permission.middleware";
import { wrapController } from "../utils/async-handler.util";

const C = wrapController(LeaveSettingsControllerRaw);
const canRead = userHasPermission(PermissionKeys.LEAVE_SETTINGS_MANAGEMENT_READ_ALL);
const canWrite = userHasPermission(PermissionKeys.LEAVE_SETTINGS_MANAGEMENT_WRITE_ALL);

/** Company-wide leave settings (hire-year entitlement rule). A change affects grants posted from then on. */
export const leaveCompanySettingsRouter = Router();
leaveCompanySettingsRouter.get("/", canRead, C.getCompanySettings);
leaveCompanySettingsRouter.put("/", canWrite, C.updateCompanySettings);

export const leaveTypesRouter = Router();
leaveTypesRouter.get("/", canRead, C.listLeaveTypes);
leaveTypesRouter.post("/", canWrite, C.createLeaveType);
leaveTypesRouter.put("/:id", canWrite, C.updateLeaveType);

/** Policies are append-only: POST creates the next version, there is no PUT. */
export const leavePoliciesRouter = Router();
leavePoliciesRouter.get("/", canRead, C.listPolicies);
leavePoliciesRouter.post("/", canWrite, C.createPolicyVersion);

export const workSchedulesRouter = Router();
workSchedulesRouter.get("/", canRead, C.listWorkSchedules);
workSchedulesRouter.post("/", canWrite, C.createWorkSchedule);
workSchedulesRouter.put("/:id", canWrite, C.updateWorkSchedule);
