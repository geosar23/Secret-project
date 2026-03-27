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

router.get("/health", (_req, res) => {
    res.json({ status: "ok2", uptime: process.uptime() });
});

router.use("/auth", authRouter);
router.use("/users", authMiddleware as RequestHandler, usersRouter);
router.use("/roles", authMiddleware as RequestHandler, roleRouter);
router.use("/companies", authMiddleware as RequestHandler, companyRouter);
router.use("/countries", authMiddleware as RequestHandler, countriesRouter);
router.use("/departments", authMiddleware as RequestHandler, departmentsRouter);
router.use("/sub-departments", authMiddleware as RequestHandler, subDepartmentsRouter);
router.use("/employment-titles", authMiddleware as RequestHandler, employmentTitlesRouter);

export default router;
