export interface IRole {
    _id: string;
    name: string;
    description?: string;
    role: string;
    level?: number;
    permissions?: string[];
    isSystemRole?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICreateRoleRequest {
    name: string;
    description: string;
    level?: number;
    permissions: string[];
}

export interface IUpdateRoleRequest {
    name?: string;
    description?: string;
    level?: number;
    permissions?: string[];
    isActive?: boolean;
}
