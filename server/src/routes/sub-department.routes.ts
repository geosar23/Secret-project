import { Router } from "express";
import { SubDepartmentController } from "../controllers/sub-department.controller";

const router = Router();

router.get("/", SubDepartmentController.getAll);
router.post("/", SubDepartmentController.create);
router.get("/:id", SubDepartmentController.getById);
router.put("/:id", SubDepartmentController.update);
router.delete("/:id", SubDepartmentController.delete);

export default router;
