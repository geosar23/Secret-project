import { Schema } from "mongoose";
import { DefaultUserRoles } from "../enums/user-role.enum";

export interface IRole {
    _id: Schema.Types.ObjectId;
    role: DefaultUserRoles | string;
    name: string;
    description: string;
    level: number; // Hierarchy level (higher = more powerful)
    permissions: string[]; // List of permission strings
    isSystemRole: boolean; // Cannot be deleted or modified
    companyId?: Schema.Types.ObjectId; // null for system-wide roles
    isActive: boolean;
    createdAt: Date;
    updatedAt?: Date;
}
