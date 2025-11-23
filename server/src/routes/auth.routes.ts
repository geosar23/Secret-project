import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const router = Router();

// Public authentication routes
router.post("/login", AuthController.login);

// Protected routes (require authentication)
// router.get("/me", AuthController.me);

// TODO: Add these employee-facing endpoints:
// router.post("/activate-account", AuthController.activateAccount); // Employee sets password after invitation
// router.post("/forgot-password", AuthController.forgotPassword);   // Request password reset
// router.post("/reset-password", AuthController.resetPassword);     // Reset password with token

export default router;
