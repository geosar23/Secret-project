import { companyModel } from "../models/company.model";
import { SubDepartmentModel } from "../models/sub-department.model";
import { config } from "../config/env";

export function subDepartmentRepository(companyId: string) {
    if (companyId === config.OG_COMPANY_ID) {
        return SubDepartmentModel;
    }

    return companyModel(SubDepartmentModel, companyId);
}
