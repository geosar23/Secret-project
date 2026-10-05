export interface IOrgChartUser {
    _id: string;
    name: string;
    email: string;
    managerId: string | null;
    title: string | null;
    subDepartmentId: string | null;
}

export interface IOrgChartDepartment {
    _id: string;
    name: string;
}

export interface IOrgChartSubDepartment {
    _id: string;
    name: string;
    departmentId: string;
}

export interface IOrgChartData {
    users: IOrgChartUser[];
    departments: IOrgChartDepartment[];
    subDepartments: IOrgChartSubDepartment[];
}
