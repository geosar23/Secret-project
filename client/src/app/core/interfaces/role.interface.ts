export interface IRole {
    _id: string;
    name: string;
    description?: string;
    role: string;
    permissions?: string[];
    isSystemRole?: boolean;
    isSytemRole?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICreateRoleRequest {
    name: string;
    description?: string;
    permissions?: string[];
}

export interface IUpdateRoleRequest {
    name?: string;
    description?: string;
    permissions?: string[];
    isActive?: boolean;
}
