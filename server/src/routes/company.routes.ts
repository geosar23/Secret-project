import { Router } from "express";
import { CompanyController } from "../controllers/company.controller";

const router = Router();

router.get("/:id/logo-url", CompanyController.getLogoUrl);

export default router;
