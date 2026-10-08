import { Router } from "express";
import { LeaveController as LeaveControllerRaw } from "../controllers/leave.controller";
import {
    LEAVE_BALANCES_READ_PERMISSIONS,
    LEAVES_PERMISSIONS,
    PermissionActions,
    PermissionKeys,
} from "../enums/permissions.enum";
import { userHasAnyPermission, userHasPermission } from "../middleware/permission.middleware";
import { wrapController } from "../utils/async-handler.util";

const router = Router();
const LeaveController = wrapController(LeaveControllerRaw);

const LEAVES_WRITE_ANY_SCOPE = Object.values(LEAVES_PERMISSIONS).filter(key =>
    key.includes(`:${PermissionActions.WRITE}:`),
);
const BALANCES_READ_ANY_SCOPE = Object.values(LEAVE_BALANCES_READ_PERMISSIONS);

// The route gate only says "may submit leave at all"; whether the actor may do it for this subject is checked
// against the subject in the service (own leave vs on behalf).
router.post("/preview", userHasAnyPermission(LEAVES_WRITE_ANY_SCOPE), LeaveController.preview);
router.post("/", userHasAnyPermission(LEAVES_WRITE_ANY_SCOPE), LeaveController.create);

router.get("/balances/me", userHasAnyPermission(BALANCES_READ_ANY_SCOPE), LeaveController.myBalances);
router.get("/balances/:userId", userHasAnyPermission(BALANCES_READ_ANY_SCOPE), LeaveController.userBalances);
router.post(
    "/balances/:userId/adjust",
    userHasPermission(PermissionKeys.LEAVE_BALANCES_WRITE_ALL),
    LeaveController.adjust,
);
router.post(
    "/entitlements/run",
    userHasPermission(PermissionKeys.LEAVE_BALANCES_WRITE_ALL),
    LeaveController.runEntitlements,
);

// Visibility follows the linked Request (requester, subject, approvers, scoped viewers)
router.get("/:id", LeaveController.get);

export default router;
