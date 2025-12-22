import { Router, RequestHandler } from "express";
import authRouter from "../routes/auth.routes";
import usersRouter from "../routes/user.routes";
import permissionRouter from "../routes/permission.routes";
import roleRouter from "../routes/role.routes";
import { authMiddleware } from "../middleware/auth.middleware";
import { companyMiddleware } from "../middleware/company.middleware";

const router = Router();

// Health check
router.get("/health", (_req, res) => {
    res.json({ status: "ok2", uptime: process.uptime() });
});

// Mount module routers under /api
router.use("/auth", authRouter);

// User management (requires authentication + company isolation)
router.use("/users", authMiddleware as RequestHandler, companyMiddleware as RequestHandler, usersRouter);

// Permission management (requires authentication + company isolation)
router.use("/permissions", authMiddleware as RequestHandler, companyMiddleware as RequestHandler, permissionRouter);

// Role management (requires authentication + company isolation)
router.use("/roles", authMiddleware as RequestHandler, companyMiddleware as RequestHandler, roleRouter);

export default router;
