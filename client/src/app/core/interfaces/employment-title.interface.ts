import { ISubDepartment } from "./sub-department.interface";

export interface IEmploymentTitle {
    _id?: string;
    name: string;
    description?: string;
    subDepartment: ISubDepartment;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICreateEmploymentTitleRequest {
    name: string;
    description?: string;
    subDepartmentId: string;
}

export interface IUpdateEmploymentTitleRequest {
    name?: string;
    description?: string;
    subDepartmentId?: string;
    isActive?: boolean;
}
