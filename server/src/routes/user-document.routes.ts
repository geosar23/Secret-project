import { Router } from "express";
import { UserDocumentController as UserDocumentControllerRaw } from "../controllers/user-document.controller";
import { uploadDocument } from "../middleware/upload.middleware";
import { wrapController } from "../utils/async-handler.util";
import { userDocumentAccess } from "../middleware/user-document-access.middleware";

const router = Router();
const UserDocumentController = wrapController(UserDocumentControllerRaw);
const canRead = userDocumentAccess("read");
const canWrite = userDocumentAccess("write");

// Per-user document list + create
router.get("/user/:userId", canRead, UserDocumentController.getForUser);
router.post("/user/:userId", canWrite, UserDocumentController.create);

// Single document CRUD
router.get("/:id", canRead, UserDocumentController.getById);
router.put("/:id", canWrite, UserDocumentController.update);
router.delete("/:id", canWrite, UserDocumentController.delete);

// Attachment management
router.post("/:id/attachment", canWrite, uploadDocument.single("file"), UserDocumentController.uploadAttachment);
router.get("/:id/attachment-url", canRead, UserDocumentController.getAttachmentUrl);
router.delete("/:id/attachment", canWrite, UserDocumentController.deleteAttachment);

export default router;
