import { DefaultUserRoles } from "../enums/user-role.enum";

export interface IRole {
    _id: string;
    role: DefaultUserRoles;
    name: string;
    description: string;
    level: number; // Hierarchy level (higher = more powerful)
    permissions: string[];
    isSystemRole: boolean; // Cannot be deleted or modified
    companyId?: string; // null for system-wide roles
    isActive: boolean;
    createdAt: Date;
    updatedAt?: Date;
}
