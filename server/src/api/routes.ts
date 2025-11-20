import { Router } from "express";
import authRouter from "../modules/auth/auth.routes";
import usersRouter from "../modules/users/user.routes";
import permissionRouter from "../core/permissions/permission.routes";
import { authMiddleware } from "../core/middleware/auth.middleware";

const router = Router();

// Health check
router.get("/health", (_req, res) => {
    res.json({ status: "ok2", uptime: process.uptime() });
});

// Mount module routers under /api
router.use("/auth", authRouter);
router.use("/users", usersRouter);

// Permission management (requires authentication)
router.use("/permissions", authMiddleware, permissionRouter);

export default router;
