import { IUserDocument } from "../interfaces/user-document.interface";
import { userDocumentRepository } from "../repositories/user-document.repository";
import { StorageService } from "./storage.service";

export const UserDocumentService = {
    getForUser: (userId: string, companyId: string) =>
        userDocumentRepository(companyId).find({ user: userId }).sort({ createdAt: -1 }).lean(),

    getById: (id: string, companyId: string) => userDocumentRepository(companyId).findById(id).lean(),

    create: (companyId: string, data: Omit<IUserDocument, "_id" | "company" | "createdAt" | "updatedAt">) =>
        userDocumentRepository(companyId).create(data),

    update: async (id: string, companyId: string, data: Partial<IUserDocument>) => {
        const repo = userDocumentRepository(companyId);
        await repo.updateOne({ _id: id }, data);
        return repo.findById(id).lean();
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

        const repo = userDocumentRepository(params.companyId);
        await repo.updateOne({ _id: params.documentId }, { attachment });
        return repo.findById(params.documentId).lean();
    },

    getAttachmentSignedUrl: async (id: string, companyId: string) => {
        const doc = await userDocumentRepository(companyId).findById(id).lean();
        if (!doc?.attachment?.path) {
            throw new Error("No attachment found for this document");
        }
        return StorageService.createSignedUrl(doc.attachment.path);
    },

    deleteAttachment: async (id: string, companyId: string) => {
        const repo = userDocumentRepository(companyId);
        const doc = await repo.findById(id).lean();
        if (!doc?.attachment?.path) {
            throw new Error("No attachment found for this document");
        }
        await StorageService.removeFile(doc.attachment.path);
        await repo.updateOne({ _id: id }, { $unset: { attachment: 1 } } as never);
    },

    delete: async (id: string, companyId: string) => {
        const repo = userDocumentRepository(companyId);
        const doc = await repo.findById(id).lean();
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
        await repo.deleteOne({ _id: id });
    },
};
