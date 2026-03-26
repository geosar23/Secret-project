export interface IDepartment {
    _id?: string;
    name: string;
    description?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICreateDepartmentRequest {
    name: string;
    description?: string;
}

export interface IUpdateDepartmentRequest {
    name?: string;
    description?: string;
    isActive?: boolean;
}
