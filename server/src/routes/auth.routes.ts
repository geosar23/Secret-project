import { RequestHandler, Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Public authentication routes
router.post("/login", AuthController.login);

// Protected routes (require authentication)
router.get("/me", authMiddleware as RequestHandler, AuthController.me as RequestHandler);

// TODO: Add these employee-facing endpoints:
// router.post("/activate-account", AuthController.activateAccount); // Employee sets password after invitation
// router.post("/forgot-password", AuthController.forgotPassword);   // Request password reset
// router.post("/reset-password", AuthController.resetPassword);     // Reset password with token

export default router;
