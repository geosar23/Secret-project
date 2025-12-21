import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { AuthenticatedRequest } from "../interfaces/auth.interface";

const router = Router();

router.get("/", (req, res, next) => UserController.getUsers(req as AuthenticatedRequest, res, next)); // Get all users
router.post("/", (req, res) => UserController.create(req as AuthenticatedRequest, res)); // Create new user (admin/HR only)
router.get("/:id", (req, res) => UserController.getById(req as AuthenticatedRequest, res));
router.put("/:id", (req, res) => UserController.update(req as AuthenticatedRequest, res));

// TODO: Add more user management endpoints:
// router.delete("/:id", UserController.delete);
// router.post("/:id/grant-permission", UserController.grantPermission);
// router.post("/:id/revoke-permission", UserController.revokePermission);

export default router;
