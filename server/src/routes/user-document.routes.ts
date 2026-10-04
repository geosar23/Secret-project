import { Router } from "express";
import { UserDocumentController as UserDocumentControllerRaw } from "../controllers/user-document.controller";
import { uploadDocument } from "../middleware/upload.middleware";
import { wrapController } from "../utils/async-handler.util";

const router = Router();
const UserDocumentController = wrapController(UserDocumentControllerRaw);

// Per-user document list + create
router.get("/user/:userId", UserDocumentController.getForUser);
router.post("/user/:userId", UserDocumentController.create);

// Single document CRUD
router.get("/:id", UserDocumentController.getById);
router.put("/:id", UserDocumentController.update);
router.delete("/:id", UserDocumentController.delete);

// Attachment management
router.post("/:id/attachment", uploadDocument.single("file"), UserDocumentController.uploadAttachment);
router.get("/:id/attachment-url", UserDocumentController.getAttachmentUrl);
router.delete("/:id/attachment", UserDocumentController.deleteAttachment);

export default router;
