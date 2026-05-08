import { Types } from "mongoose";

export interface ILogoMetadata {
    bucket: string;
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
}

export interface ICompany {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    logo?: ILogoMetadata;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
