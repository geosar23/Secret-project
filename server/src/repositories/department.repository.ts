import { companyModel } from "../models/company.model";
import { DepartmentModel } from "../models/department.model";

export function departmentRepository(companyId: string) {
    return companyModel(DepartmentModel, companyId);
}
