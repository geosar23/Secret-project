import { companyModel } from "../models/company.model";
import { DepartmentModel } from "../models/department.model";

export function departmentRepository(companyId: string) {
    if (companyId === process.env.OG_COMPANY_ID) {
        return DepartmentModel;
    }

    return companyModel(DepartmentModel, companyId);
}
