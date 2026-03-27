import { Types } from "mongoose";

export interface IDepartment {
    _id?: Types.ObjectId;
    name: string;
    company: Types.ObjectId;
    description?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
