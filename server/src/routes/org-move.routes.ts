import { Router } from "express";
import { OrgMoveController as OrgMoveControllerRaw } from "../controllers/org-move.controller";
import { wrapController } from "../utils/async-handler.util";

const router = Router();
const OrgMoveController = wrapController(OrgMoveControllerRaw);

// Permission is checked per operation in the controller (sub-department vs. title write access).
router.post("/preview", OrgMoveController.preview);
router.post("/apply", OrgMoveController.apply);
router.post("/:id/undo", OrgMoveController.undo);

export default router;
