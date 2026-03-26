import { Types } from "mongoose";

export interface IDepartment {
    _id?: Types.ObjectId;
    name: string;
    description?: string;
    company: Types.ObjectId;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
