import { Types } from "mongoose";

export interface IUserDocument {
    _id?: Types.ObjectId;
    user: Types.ObjectId;
    company: Types.ObjectId;
    type: string;
    documentNumber?: string;
    expiryDate?: Date;
    issuingCountry?: string;
    notes?: string;
    attachment?: {
        bucket: string;
        path: string;
        originalName: string;
        mimeType: string;
        size: number;
        uploadedAt: Date;
    };
    createdAt?: Date;
    updatedAt?: Date;
}
