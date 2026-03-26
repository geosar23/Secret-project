import { Router } from "express";
import { EmploymentTitleController } from "../controllers/employment-title.controller";

const router = Router();

router.get("/", EmploymentTitleController.getAll);
router.post("/", EmploymentTitleController.create);
router.get("/:id", EmploymentTitleController.getById);
router.put("/:id", EmploymentTitleController.update);
router.delete("/:id", EmploymentTitleController.delete);

export default router;
