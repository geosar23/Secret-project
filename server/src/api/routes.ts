import { Router, RequestHandler } from "express";
import authRouter from "../routes/auth.routes";
import usersRouter from "../routes/user.routes";
import roleRouter from "../routes/role.routes";
import companyRouter from "../routes/company.routes";
import countriesRouter from "../routes/country.routes";
import departmentsRouter from "../routes/department.routes";
import subDepartmentsRouter from "../routes/sub-department.routes";
import employmentTitlesRouter from "../routes/employment-title.routes";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Health check
router.get("/health", (_req, res) => {
    res.json({ status: "ok2", uptime: process.uptime() });
});

// Mount module routers under /api
router.use("/auth", authRouter);

// User management (requires authentication + company isolation)
router.use("/users", authMiddleware as RequestHandler, usersRouter);

// Role management (requires authentication + company isolation)
router.use("/roles", authMiddleware as RequestHandler, roleRouter);

// Company management (requires authentication)
router.use("/companies", authMiddleware as RequestHandler, companyRouter);

// Country management (requires authentication + company isolation)
router.use("/countries", authMiddleware as RequestHandler, countriesRouter);

// Department management (requires authentication + company isolation)
router.use("/departments", authMiddleware as RequestHandler, departmentsRouter);

// Sub-department management (requires authentication + company isolation)
router.use("/sub-departments", authMiddleware as RequestHandler, subDepartmentsRouter);

// Employment title management (requires authentication + company isolation)
router.use("/employment-titles", authMiddleware as RequestHandler, employmentTitlesRouter);

export default router;
