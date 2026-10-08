import { Router } from "express";
import { RequestController as RequestControllerRaw } from "../controllers/request.controller";
import { wrapController } from "../utils/async-handler.util";

const router = Router();
const RequestController = wrapController(RequestControllerRaw);

// Authenticated only: every handler is limited to the caller (inbox, own requests) or checks visibility and the
// request type's rules itself (get, decide, cancel). Approval authority is never a route permission.
router.get("/inbox", RequestController.inbox);
router.get("/mine", RequestController.mine);
router.get("/summary", RequestController.summary);
router.get("/:id", RequestController.get);
router.post("/:id/decision", RequestController.decide);
router.post("/:id/cancel", RequestController.cancel);

export default router;

/** GET /api/request-types: the request types the company has enabled (for pickers and filters). */
export const requestTypesRouter = Router();
requestTypesRouter.get("/", RequestController.listTypes);
