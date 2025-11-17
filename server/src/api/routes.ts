import { Router } from "express";
import authRouter from "../modules/auth/auth.routes";
import usersRouter from "../modules/users/user.routes";

const router = Router();

// Health check
router.get("/health", (_req, res) => {
	res.json({ status: "ok2", uptime: process.uptime() });
});

// Mount module routers under /api
router.use("/auth", authRouter);
router.use("/users", usersRouter);

export default router;
