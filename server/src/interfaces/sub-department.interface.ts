import { Types } from "mongoose";

export interface ISubDepartment {
    _id?: Types.ObjectId;
    name: string;
    description?: string;
    department: Types.ObjectId;
    company: Types.ObjectId;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
