import { Router } from "express";
import { UserController } from "../controllers/user.controller";

const router = Router();
router.get("/", UserController.getUsers);
router.get("/:id", UserController.getById);

// TODO: Add more user management endpoints:
// router.post("/", (req, res) => UserController.create(req as AuthenticatedRequest, res));
// router.put("/:id", (req, res) => UserController.update(req as AuthenticatedRequest, res));
// router.delete("/:id", UserController.delete);
// router.post("/:id/grant-permission", UserController.grantPermission);
// router.post("/:id/revoke-permission", UserController.revokePermission);

export default router;
