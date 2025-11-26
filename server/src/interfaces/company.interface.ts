import { Schema } from "mongoose";

export interface ICompany {
    _id: Schema.Types.ObjectId;
    name: string;
    slug: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
