import { Router } from "express";
import { CountryController } from "../controllers/country.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";

const router = Router();

const canReadCountries = userHasAnyPermission([
    PermissionKeys.ALL,
    PermissionKeys.ALL_COMPANY,
    PermissionKeys.COUNTRIES_MANAGEMENT_READ_ALL,
    PermissionKeys.COUNTRIES_MANAGEMENT_READ_COMPANY,
    PermissionKeys.COUNTRIES_MANAGEMENT_ALL_ALL,
    PermissionKeys.COUNTRIES_MANAGEMENT_ALL_COMPANY,
]);

const canManageCountries = userHasAnyPermission([
    PermissionKeys.ALL,
    PermissionKeys.ALL_COMPANY,
    PermissionKeys.COUNTRIES_MANAGEMENT_ALL_ALL,
    PermissionKeys.COUNTRIES_MANAGEMENT_ALL_COMPANY,
]);

router.get("/", canReadCountries, CountryController.getAll);
router.post("/", canManageCountries, CountryController.create);
router.get("/:id", canReadCountries, CountryController.getById);
router.put("/:id", canManageCountries, CountryController.update);
router.delete("/:id", canManageCountries, CountryController.delete);

export default router;
