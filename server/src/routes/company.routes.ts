import { Router } from "express";
import { CompanyController } from "../controllers/company.controller";

const router = Router();

router.get("/", CompanyController.getAll);
router.post("/", CompanyController.create);
router.get("/:id", CompanyController.getById);
router.put("/:id", CompanyController.update);
router.delete("/:id", CompanyController.delete);

export default router;
