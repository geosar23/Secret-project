import { Router } from "express";
import { UserController } from "../controllers/user.controller";

const router = Router();
router.get("/", UserController.getUsers);
router.get("/:id", UserController.getById);
router.put("/:id", UserController.update);
router.post("/", UserController.create); //TODO: NOT TESTED
router.put("/:id/change-password", UserController.changePassword); //TODO: NOT TESTED
// TODO: Add more user management endpoints:
// router.delete("/:id", UserController.delete);
// router.post("/:id/grant-permission", UserController.grantPermission);
// router.post("/:id/revoke-permission", UserController.revokePermission);

export default router;
