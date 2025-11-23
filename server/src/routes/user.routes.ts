import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { AuthenticatedRequest } from "../interfaces/permission.interface";

const router = Router();
const userController = new UserController();

// All routes here require authentication + permissions (set in api/routes.ts)
// Only admins/HR with proper permissions can create users

router.get("/", (req, res, next) =>
    userController.getUsers(req as AuthenticatedRequest, res, next),
); // Get all users
router.post("/", (req, res) => userController.create(req, res)); // Create new user (admin/HR only)

// TODO: Add more user management endpoints:
// router.get("/:id", UserController.getById);
// router.put("/:id", UserController.update);
// router.delete("/:id", UserController.delete);
// router.post("/:id/grant-permission", UserController.grantPermission);
// router.post("/:id/revoke-permission", UserController.revokePermission);

export default router;
