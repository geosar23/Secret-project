import { UserRole } from "../enums";

export interface IRole {
    _id: string;
    role: UserRole;
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
