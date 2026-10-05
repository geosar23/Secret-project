import { Router } from "express";
import { UserController as UserControllerRaw } from "../controllers/user.controller";
import { userHasAnyPermission, userHasPermissionCategory } from "../middleware/permission.middleware";
import { PermissionCategories, PermissionKeys } from "../enums/permissions.enum";
import { uploadProfileImage } from "../middleware/upload.middleware";
import { wrapController } from "../utils/async-handler.util";

const router = Router();
const UserController = wrapController(UserControllerRaw);
router.get("/", UserController.getUsers);
router.get("/effective-permissions", UserController.getEffectivePermissions);
router.get("/org-chart", UserController.getOrgChart); // any authenticated employee; non-sensitive fields only
router.get("/:id/accessForSubject", UserController.accessForSubject);
router.get("/:id", UserController.getById);
router.put("/:id", UserController.update);
router.post("/", userHasPermissionCategory(PermissionCategories.USER_CREATE), UserController.create);
router.put("/:id/change-password", UserController.changePassword); //TODO: NOT TESTED
router.post("/:id/profile-image", uploadProfileImage.single("image"), UserController.uploadProfileImage);
router.get("/:id/profile-image-url", UserController.getProfileImageUrl);
router.delete("/:id/profile-image", UserController.deleteProfileImage);
router.post(
    "/:id/grant-permission",
    userHasAnyPermission([
        PermissionKeys.USERS_MANAGEMENT_WRITE_ALL,
        PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT,
        PermissionKeys.USERS_MANAGEMENT_WRITE_COUNTRY,
        PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT_COUNTRY,
        PermissionKeys.USERS_MANAGEMENT_WRITE_MANAGED,
        PermissionKeys.USERS_MANAGEMENT_WRITE_SELF,
    ]),
    UserController.grantPermission,
);
router.post(
    "/:id/revoke-permission",
    userHasAnyPermission([
        PermissionKeys.USERS_MANAGEMENT_WRITE_ALL,
        PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT,
        PermissionKeys.USERS_MANAGEMENT_WRITE_COUNTRY,
        PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT_COUNTRY,
        PermissionKeys.USERS_MANAGEMENT_WRITE_MANAGED,
        PermissionKeys.USERS_MANAGEMENT_WRITE_SELF,
    ]),
    UserController.revokePermission,
);

// TODO: Add more user management endpoints:
// router.delete("/:id", UserController.delete);

export default router;
