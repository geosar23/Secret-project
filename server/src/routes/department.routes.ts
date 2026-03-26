import { Router } from "express";
import { DepartmentController } from "../controllers/department.controller";

const router = Router();

router.get("/", DepartmentController.getAll);
router.post("/", DepartmentController.create);
router.post("/seed-examples", DepartmentController.seedExamples);
router.get("/:id", DepartmentController.getById);
router.put("/:id", DepartmentController.update);
router.delete("/:id", DepartmentController.delete);

export default router;
