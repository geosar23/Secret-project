import { Types } from "mongoose";
import { IAddress } from "./user.interface";

export interface IOffice {
    _id?: Types.ObjectId;
    name: string;
    company?: Types.ObjectId;
    country?: Types.ObjectId;
    address?: IAddress;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
