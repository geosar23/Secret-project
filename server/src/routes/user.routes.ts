import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";
import { uploadProfileImage } from "../middleware/upload.middleware";

const router = Router();
router.get("/", UserController.getUsers);
router.get("/effective-permissions", UserController.getEffectivePermissions);
router.get("/:id", UserController.getById);
router.put("/:id", UserController.update);
router.post("/", UserController.create); //TODO: NOT TESTED
router.put("/:id/change-password", UserController.changePassword); //TODO: NOT TESTED
router.post("/:id/profile-image", uploadProfileImage.single("image"), UserController.uploadProfileImage);
router.get("/:id/profile-image-url", UserController.getProfileImageUrl);
router.delete("/:id/profile-image", UserController.deleteProfileImage);
router.post(
    "/:id/grant-permission",
    userHasAnyPermission([
        PermissionKeys.ALL,
        PermissionKeys.USERS_MANAGEMENT_ALL_ALL,
        PermissionKeys.USERS_MANAGEMENT_ALL_DEPARTMENT,
        PermissionKeys.USERS_MANAGEMENT_ALL_COUNTRY,
        PermissionKeys.USERS_MANAGEMENT_ALL_DEPARTMENT_COUNTRY,
        PermissionKeys.USERS_MANAGEMENT_ALL_MANAGED,
        PermissionKeys.USERS_MANAGEMENT_ALL_SELF,
    ]),
    UserController.grantPermission,
);
router.post(
    "/:id/revoke-permission",
    userHasAnyPermission([
        PermissionKeys.ALL,
        PermissionKeys.USERS_MANAGEMENT_ALL_ALL,
        PermissionKeys.USERS_MANAGEMENT_ALL_DEPARTMENT,
        PermissionKeys.USERS_MANAGEMENT_ALL_COUNTRY,
        PermissionKeys.USERS_MANAGEMENT_ALL_DEPARTMENT_COUNTRY,
        PermissionKeys.USERS_MANAGEMENT_ALL_MANAGED,
        PermissionKeys.USERS_MANAGEMENT_ALL_SELF,
    ]),
    UserController.revokePermission,
);

// TODO: Add more user management endpoints:
// router.delete("/:id", UserController.delete);

export default router;
