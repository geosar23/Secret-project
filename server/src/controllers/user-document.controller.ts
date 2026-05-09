/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { UserDocumentService } from "../services/user-document.service";
import { softError, success } from "../utils/response.util";
import { isValidObjectId } from "../utils/field-sanitizer.util";
import { DocumentType } from "../enums/profile.enum";

const VALID_DOC_TYPES = new Set(Object.values(DocumentType));

export class UserDocumentController {
    static async getForUser(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const userId = req.params.userId;

            if (!isValidObjectId(userId)) {
                res.json(softError("Invalid user id"));
                return;
            }

            const docs = await UserDocumentService.getForUser(userId, requestingUser.companyId);
            res.json(success(docs));
        } catch (error: any) {
            console.log("Error in UserDocumentController.getForUser:", error);
            res.json(softError(error.message, error));
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const doc = await UserDocumentService.getById(req.params.id, requestingUser.companyId);
            if (!doc) {
                res.json(softError("Document not found"));
                return;
            }
            res.json(success(doc));
        } catch (error: any) {
            console.log("Error in UserDocumentController.getById:", error);
            res.json(softError(error.message, error));
        }
    }

    static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const userId = req.params.userId;

            if (!isValidObjectId(userId)) {
                res.json(softError("Invalid user id"));
                return;
            }

            const { type, documentNumber, expiryDate, issuingCountry, notes } = req.body as Record<string, unknown>;

            if (typeof type !== "string" || !VALID_DOC_TYPES.has(type as DocumentType)) {
                res.json(softError(`type is required and must be one of: ${[...VALID_DOC_TYPES].join(", ")}`));
                return;
            }

            const data: Record<string, unknown> = {
                user: userId,
                company: requestingUser.companyId,
                type,
            };

            if (typeof documentNumber === "string" && documentNumber.trim()) {
                data.documentNumber = documentNumber.trim();
            }
            if (typeof issuingCountry === "string" && issuingCountry.trim()) {
                data.issuingCountry = issuingCountry.trim();
            }
            if (typeof notes === "string" && notes.trim()) {
                data.notes = notes.trim();
            }
            if (expiryDate !== undefined && expiryDate !== null) {
                const d = new Date(expiryDate as string);
                if (!isNaN(d.getTime())) {
                    data.expiryDate = d;
                }
            }

            const doc = await UserDocumentService.create(data as any);
            res.json(success(doc));
        } catch (error: any) {
            console.log("Error in UserDocumentController.create:", error);
            res.json(softError(error.message, error));
        }
    }

    static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const { type, documentNumber, expiryDate, issuingCountry, notes } = req.body as Record<string, unknown>;
            const patch: Record<string, unknown> = {};

            if (type !== undefined) {
                if (typeof type !== "string" || !VALID_DOC_TYPES.has(type as DocumentType)) {
                    res.json(softError(`type must be one of: ${[...VALID_DOC_TYPES].join(", ")}`));
                    return;
                }
                patch.type = type;
            }
            if (documentNumber !== undefined) {
                patch.documentNumber = typeof documentNumber === "string" ? documentNumber.trim() || null : null;
            }
            if (issuingCountry !== undefined) {
                patch.issuingCountry = typeof issuingCountry === "string" ? issuingCountry.trim() || null : null;
            }
            if (notes !== undefined) {
                patch.notes = typeof notes === "string" ? notes.trim() || null : null;
            }
            if (expiryDate !== undefined) {
                if (expiryDate === null || expiryDate === "") {
                    patch.expiryDate = null;
                } else {
                    const d = new Date(expiryDate as string);
                    if (!isNaN(d.getTime())) {
                        patch.expiryDate = d;
                    }
                }
            }

            const updated = await UserDocumentService.update(req.params.id, requestingUser.companyId, patch as any);
            if (!updated) {
                res.json(softError("Document not found"));
                return;
            }
            res.json(success(updated));
        } catch (error: any) {
            console.log("Error in UserDocumentController.update:", error);
            res.json(softError(error.message, error));
        }
    }

    static async uploadAttachment(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const docId = req.params.id;

            const doc = await UserDocumentService.getById(docId, requestingUser.companyId);
            if (!doc) {
                res.json(softError("Document not found"));
                return;
            }

            const file = req.file;
            if (!file) {
                res.json(softError("No file uploaded"));
                return;
            }

            const updated = await UserDocumentService.uploadAttachment({
                documentId: docId,
                companyId: requestingUser.companyId,
                userId: String(doc.user),
                fileBuffer: file.buffer,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
            });

            res.json(success(updated));
        } catch (error: any) {
            console.log("Error in UserDocumentController.uploadAttachment:", error);
            res.json(softError(error.message, error));
        }
    }

    static async getAttachmentUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const result = await UserDocumentService.getAttachmentSignedUrl(req.params.id, requestingUser.companyId);
            res.json(success(result));
        } catch (error: any) {
            console.log("Error in UserDocumentController.getAttachmentUrl:", error);
            res.json(softError(error.message, error));
        }
    }

    static async deleteAttachment(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            await UserDocumentService.deleteAttachment(req.params.id, requestingUser.companyId);
            res.json(success({}));
        } catch (error: any) {
            console.log("Error in UserDocumentController.deleteAttachment:", error);
            res.json(softError(error.message, error));
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            await UserDocumentService.delete(req.params.id, requestingUser.companyId);
            res.json(success({}));
        } catch (error: any) {
            console.log("Error in UserDocumentController.delete:", error);
            res.json(softError(error.message, error));
        }
    }
}
