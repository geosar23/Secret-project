import { companyModel } from "../models/company.model";
import { SubDepartmentModel } from "../models/sub-department.model";

export function subDepartmentRepository(companyId: string) {
    if (companyId === process.env.OG_COMPANY_ID) {
        return SubDepartmentModel;
    }

    return companyModel(SubDepartmentModel, companyId);
}
