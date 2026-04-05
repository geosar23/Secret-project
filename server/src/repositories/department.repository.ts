import { companyModel } from "../models/company.model";
import { DepartmentModel } from "../models/department.model";
import { config } from "../config/env";

export function departmentRepository(companyId: string) {
    if (companyId === config.OG_COMPANY_ID) {
        return DepartmentModel;
    }

    return companyModel(DepartmentModel, companyId);
}
