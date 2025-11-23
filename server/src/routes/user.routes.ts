import { Router } from "express";
import { UserController } from "../controllers/user.controller";

const router = Router();

// All routes here require authentication + permissions (set in api/routes.ts)
// Only admins/HR with proper permissions can create users

router.get("/", UserController.getAll); // Get all users
router.post("/", UserController.create); // Create new user (admin/HR only)

// TODO: Add more user management endpoints:
// router.get("/:id", UserController.getById);
// router.put("/:id", UserController.update);
// router.delete("/:id", UserController.delete);
// router.post("/:id/grant-permission", UserController.grantPermission);
// router.post("/:id/revoke-permission", UserController.revokePermission);

export default router;
