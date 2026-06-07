import { IDepartment } from "./department.interface";

export interface ISubDepartment {
    _id?: string;
    name: string;
    description?: string;
    department: IDepartment;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICreateSubDepartmentRequest {
    name: string;
    description?: string;
    departmentId: string;
}

export interface IUpdateSubDepartmentRequest {
    name?: string;
    description?: string;
    departmentId?: string;
    isActive?: boolean;
}
