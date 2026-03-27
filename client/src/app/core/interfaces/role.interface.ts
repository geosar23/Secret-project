import { ICompany } from "./company.interface";

export interface IRole {
    _id: string;
    name: string;
    description?: string;
    role: string;
    company?: ICompany;
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
    companyId?: string;
}

export interface IUpdateRoleRequest {
    name?: string;
    description?: string;
    permissions?: string[];
    companyId?: string;
    isActive?: boolean;
}
