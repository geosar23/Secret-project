import { Router } from "express";
import { OfficeController as OfficeControllerRaw } from "../controllers/office.controller";
import { userHasAnyPermission } from "../middleware/permission.middleware";
import { PermissionKeys } from "../enums/permissions.enum";
import { wrapController } from "../utils/async-handler.util";

const router = Router();
const OfficeController = wrapController(OfficeControllerRaw);

const canManageOffices = userHasAnyPermission([PermissionKeys.OFFICES_MANAGEMENT_WRITE_ALL]);

router.get("/", OfficeController.getAll);
router.post("/", canManageOffices, OfficeController.create);
router.get("/:id", OfficeController.getById);
router.put("/:id", canManageOffices, OfficeController.update);
router.delete("/:id", canManageOffices, OfficeController.delete);

export default router;
