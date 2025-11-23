import { Router, RequestHandler } from "express";
import authRouter from "../routes/auth.routes";
import usersRouter from "../routes/user.routes";
import permissionRouter from "../routes/permission.routes";
import roleRouter from "../routes/role.routes";
import permissionDefinitionRouter from "../routes/permission-definition.routes";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Health check
router.get("/health", (_req, res) => {
    res.json({ status: "ok2", uptime: process.uptime() });
});

// Mount module routers under /api
router.use("/auth", authRouter);

// User management (requires authentication)
router.use("/users", authMiddleware as RequestHandler, usersRouter);

// Permission management (requires authentication)
router.use("/permissions", authMiddleware as RequestHandler, permissionRouter);

// Role management (requires authentication)
router.use("/roles", authMiddleware as RequestHandler, roleRouter);

// Permission definitions (requires authentication)
router.use("/permission-definitions", authMiddleware as RequestHandler, permissionDefinitionRouter);

export default router;
