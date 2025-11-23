import { Router } from "express";
import { UserController } from "../controllers/user.controller";

const router = Router();

router.get("/", UserController.getAll);
router.post("/", UserController.create);

export default router;
