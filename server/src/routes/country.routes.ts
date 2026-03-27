import { Router } from "express";
import { CountryController } from "../controllers/country.controller";

const router = Router();

router.get("/", CountryController.getAll);
router.post("/", CountryController.create);
router.get("/:id", CountryController.getById);
router.put("/:id", CountryController.update);
router.delete("/:id", CountryController.delete);

export default router;
