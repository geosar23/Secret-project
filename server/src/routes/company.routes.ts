import { Router } from "express";
import { CompanyController } from "../controllers/company.controller";

const router = Router();

router.get("/:id", CompanyController.getCompanyData);

export default router;
