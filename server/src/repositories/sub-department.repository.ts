import { companyModel } from "../models/company.model";
import { SubDepartmentModel } from "../models/sub-department.model";

export function subDepartmentRepository(companyId: string) {
    return companyModel(SubDepartmentModel, companyId);
}
