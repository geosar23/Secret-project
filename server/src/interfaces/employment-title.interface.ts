import { Types } from "mongoose";

export interface IEmploymentTitle {
    _id?: Types.ObjectId;
    name: string;
    description?: string;
    subDepartment: Types.ObjectId;
    company: Types.ObjectId;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
