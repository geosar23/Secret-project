import { Router, RequestHandler } from "express";
import authRouter from "./routes/auth.routes";
import usersRouter from "./routes/user.routes";
import roleRouter from "./routes/role.routes";
import companyRouter from "./routes/company.routes";
import countriesRouter from "./routes/country.routes";
import departmentsRouter from "./routes/department.routes";
import subDepartmentsRouter from "./routes/sub-department.routes";
import employmentTitlesRouter from "./routes/employment-title.routes";
import levelsRouter from "./routes/level.routes";
import officesRouter from "./routes/office.routes";
import orgMoveRouter from "./routes/org-move.routes";
import userDocumentsRouter from "./routes/user-document.routes";
import requestsRouter, { requestTypesRouter } from "./routes/request.routes";
import leavesRouter from "./routes/leave.routes";
import {
    leaveCompanySettingsRouter,
    leavePoliciesRouter,
    leaveTypesRouter,
    workSchedulesRouter,
} from "./routes/leave-settings.routes";
import { authMiddleware } from "./middleware/auth.middleware";

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
router.use("/org-moves", authMiddleware as RequestHandler, orgMoveRouter);
router.use("/levels", authMiddleware as RequestHandler, levelsRouter);
router.use("/offices", authMiddleware as RequestHandler, officesRouter);
router.use("/user-documents", authMiddleware as RequestHandler, userDocumentsRouter);
router.use("/requests", authMiddleware as RequestHandler, requestsRouter);
router.use("/request-types", authMiddleware as RequestHandler, requestTypesRouter);
router.use("/leaves", authMiddleware as RequestHandler, leavesRouter);
router.use("/leave-settings", authMiddleware as RequestHandler, leaveCompanySettingsRouter);
router.use("/leave-types", authMiddleware as RequestHandler, leaveTypesRouter);
router.use("/leave-policies", authMiddleware as RequestHandler, leavePoliciesRouter);
router.use("/work-schedules", authMiddleware as RequestHandler, workSchedulesRouter);

export default router;
