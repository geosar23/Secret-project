import { Types } from "mongoose";

export interface ICompany {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
