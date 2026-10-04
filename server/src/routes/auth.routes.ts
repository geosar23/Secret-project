import { RequestHandler, Router } from "express";
import { AuthController as AuthControllerRaw } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { userHasPermissionCategory } from "../middleware/permission.middleware";
import { PermissionCategories } from "../enums/permissions.enum";
import { wrapController } from "../utils/async-handler.util";

const router = Router();
const AuthController = wrapController(AuthControllerRaw);

// Public authentication routes
router.post("/login", AuthController.login);

// Protected routes (require authentication)
router.get("/me", authMiddleware as RequestHandler, AuthController.me);

router.post(
    "/reset-password",
    authMiddleware as RequestHandler,
    userHasPermissionCategory(PermissionCategories.RESET_PASSWORD) as RequestHandler,
    AuthController.resetPassword as RequestHandler,
);

// TODO: Add these employee-facing endpoints:
// router.post("/activate-account", AuthController.activateAccount); // Employee sets password after invitation
// router.post("/forgot-password", AuthController.forgotPassword);   // Request password reset

export default router;
