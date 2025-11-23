import { Router, RequestHandler } from "express";
import authRouter from "../routes/auth.routes";
import usersRouter from "../routes/user.routes";
import permissionRouter from "../routes/permission.routes";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Health check
router.get("/health", (_req, res) => {
    res.json({ status: "ok2", uptime: process.uptime() });
});

// Mount module routers under /api
router.use("/auth", authRouter);
router.use("/users", usersRouter);

// Permission management (requires authentication)
router.use("/permissions", authMiddleware as RequestHandler, permissionRouter);

export default router;
