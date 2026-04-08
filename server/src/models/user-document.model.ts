import { Schema, model } from "mongoose";
import { IUserDocument } from "../interfaces/user-document.interface";
import { DocumentType } from "../enums/profile.enum";

const AttachmentSchema = new Schema(
    {
        bucket: { type: String, trim: true },
        path: { type: String, trim: true },
        originalName: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        size: { type: Number },
        uploadedAt: { type: Date },
    },
    { _id: false },
);

const UserDocumentSchema = new Schema<IUserDocument>(
    {
        user: { type: Schema.Types.ObjectId, ref: "Users", required: true },
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        type: { type: String, enum: Object.values(DocumentType), required: true, trim: true },
        documentNumber: { type: String, trim: true },
        expiryDate: { type: Date },
        issuingCountry: { type: String, trim: true },
        notes: { type: String, trim: true },
        attachment: { type: AttachmentSchema },
    },
    { timestamps: true, collection: "UserDocuments", autoIndex: false },
);

export const UserDocumentModel = model<IUserDocument>("UserDocuments", UserDocumentSchema);
