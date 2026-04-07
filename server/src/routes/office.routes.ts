import { Router } from "express";
import { OfficeController } from "../controllers/office.controller";

const router = Router();

router.get("/", OfficeController.getAll);
router.post("/", OfficeController.create);
router.get("/:id", OfficeController.getById);
router.put("/:id", OfficeController.update);
router.delete("/:id", OfficeController.delete);

export default router;
