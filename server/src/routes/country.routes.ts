import { Router } from "express";
import { CountryController } from "../controllers/country.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";

const router = Router();

const canReadCountries = userHasAnyPermission([PermissionKeys.COUNTRIES_MANAGEMENT_READ_ALL]);

const canManageCountries = userHasAnyPermission([PermissionKeys.COUNTRIES_MANAGEMENT_WRITE_ALL]);

router.get("/", canReadCountries, CountryController.getAll);
router.post("/", canManageCountries, CountryController.create);
router.get("/:id", canReadCountries, CountryController.getById);
router.put("/:id", canManageCountries, CountryController.update);
router.delete("/:id", canManageCountries, CountryController.delete);

export default router;
