import { Router } from "express";
import { CompanyController as CompanyControllerRaw } from "../controllers/company.controller";
import { wrapController } from "../utils/async-handler.util";

const router = Router();
const CompanyController = wrapController(CompanyControllerRaw);

router.get("/:id", CompanyController.getCompanyData);

export default router;
