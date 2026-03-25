import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";

const router = Router();

// Permission sets for different operations
const readPermissions = [
    PermissionKeys.ALL,
    PermissionKeys.USERS_MANAGEMENT_READ_ALL,
    PermissionKeys.USERS_MANAGEMENT_READ_COMPANY,
    PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT,
    PermissionKeys.USERS_MANAGEMENT_READ_COUNTRY,
    PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT_COUNTRY,
    PermissionKeys.USERS_MANAGEMENT_READ_MANAGED,
    PermissionKeys.USERS_MANAGEMENT_READ_OWN,
    PermissionKeys.USERS_MANAGEMENT_READ_SELF,
];

const writePermissions = [
    PermissionKeys.ALL,
    PermissionKeys.USERS_MANAGEMENT_ALL_ALL,
    PermissionKeys.USERS_MANAGEMENT_ALL_COMPANY,
    PermissionKeys.USERS_MANAGEMENT_ALL_DEPARTMENT,
    PermissionKeys.USERS_MANAGEMENT_ALL_COUNTRY,
    PermissionKeys.USERS_MANAGEMENT_ALL_DEPARTMENT_COUNTRY,
    PermissionKeys.USERS_MANAGEMENT_ALL_MANAGED,
    PermissionKeys.USERS_MANAGEMENT_ALL_OWN,
    PermissionKeys.USERS_MANAGEMENT_ALL_SELF,
];

router.get("/", userHasAnyPermission(readPermissions), UserController.getUsers);
router.get("/:id", userHasAnyPermission(readPermissions), UserController.getById);
router.put("/:id", userHasAnyPermission(writePermissions), UserController.update);
router.post("/", userHasAnyPermission(writePermissions), UserController.create); //TODO: NOT TESTED
router.put("/:id/change-password", userHasAnyPermission(writePermissions), UserController.changePassword); //TODO: NOT TESTED
router.post("/:id/grant-permission", userHasAnyPermission(writePermissions), UserController.grantPermission);
router.post("/:id/revoke-permission", userHasAnyPermission(writePermissions), UserController.revokePermission);

// TODO: Add more user management endpoints:
// router.delete("/:id", UserController.delete);

export default router;
