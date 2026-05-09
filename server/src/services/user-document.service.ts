import { IUserDocument } from "../interfaces/user-document.interface";
import { UserDocumentModel } from "../models/user-document.model";
import { StorageService } from "./storage.service";

export const UserDocumentService = {
    getForUser: (userId: string, companyId: string) =>
        UserDocumentModel.find({ user: userId, company: companyId }).sort({ createdAt: -1 }).lean(),

    getById: (id: string, companyId: string) => UserDocumentModel.findOne({ _id: id, company: companyId }).lean(),

    create: (data: Omit<IUserDocument, "_id" | "createdAt" | "updatedAt">) => UserDocumentModel.create(data),

    update: async (id: string, companyId: string, data: Partial<IUserDocument>) => {
        await UserDocumentModel.updateOne({ _id: id, company: companyId }, data);
        return UserDocumentModel.findOne({ _id: id, company: companyId }).lean();
    },

    uploadAttachment: async (params: {
        documentId: string;
        companyId: string;
        userId: string;
        fileBuffer: Buffer;
        originalName: string;
        mimeType: string;
        size: number;
    }) => {
        const { bucket, path } = await StorageService.uploadUserDocument({
            companyId: params.companyId,
            userId: params.userId,
            documentId: params.documentId,
            fileBuffer: params.fileBuffer,
            originalName: params.originalName,
            mimeType: params.mimeType,
        });

        const attachment = {
            bucket,
            path,
            originalName: params.originalName,
            mimeType: params.mimeType,
            size: params.size,
            uploadedAt: new Date(),
        };

        await UserDocumentModel.updateOne({ _id: params.documentId, company: params.companyId }, { attachment });
        return UserDocumentModel.findOne({ _id: params.documentId, company: params.companyId }).lean();
    },

    getAttachmentSignedUrl: async (id: string, companyId: string) => {
        const doc = await UserDocumentModel.findOne({ _id: id, company: companyId }).lean();
        if (!doc?.attachment?.path) {
            throw new Error("No attachment found for this document");
        }
        return StorageService.createSignedUrl(doc.attachment.path);
    },

    deleteAttachment: async (id: string, companyId: string) => {
        const doc = await UserDocumentModel.findOne({ _id: id, company: companyId }).lean();
        if (!doc?.attachment?.path) {
            throw new Error("No attachment found for this document");
        }
        await StorageService.removeFile(doc.attachment.path);
        await UserDocumentModel.updateOne({ _id: id, company: companyId }, { $unset: { attachment: 1 } });
    },

    delete: async (id: string, companyId: string) => {
        const doc = await UserDocumentModel.findOne({ _id: id, company: companyId }).lean();
        if (!doc) {
            return;
        }
        if (doc.attachment?.path) {
            try {
                await StorageService.removeFile(doc.attachment.path);
            } catch {
                // best-effort: continue deletion even if storage remove fails
            }
        }
        await UserDocumentModel.deleteOne({ _id: id, company: companyId });
    },
};
