import { RequestHandler, Router } from "express";
import { AuthController as AuthControllerRaw } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { userHasPermissionCategory } from "../middleware/permission.middleware";
import { PermissionCategories } from "../enums/permissions.enum";
import { forgotPasswordLimiter, passwordSetupLimiter } from "../middleware/rate-limit.middleware";
import { wrapController } from "../utils/async-handler.util";

const router = Router();
const AuthController = wrapController(AuthControllerRaw);

// Public authentication routes
router.post("/login", AuthController.login);
router.post("/forgot-password", forgotPasswordLimiter, AuthController.forgotPassword); // request a reset link
router.post("/password-setup", passwordSetupLimiter, AuthController.passwordSetup); // set a password from an emailed link

// Protected routes (require authentication)
router.get("/me", authMiddleware as RequestHandler, AuthController.me);

router.post(
    "/reset-password",
    authMiddleware as RequestHandler,
    userHasPermissionCategory(PermissionCategories.RESET_PASSWORD) as RequestHandler,
    AuthController.resetPassword as RequestHandler,
);

// TODO (P0-24): POST /activate-account reuses the one-time token mechanics behind /password-setup.

export default router;
