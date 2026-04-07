import { Types } from "mongoose";

export interface ILevel {
    _id?: Types.ObjectId;
    name: string;
    order?: number;
    company?: Types.ObjectId;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
