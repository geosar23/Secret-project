import { companyModel } from "../models/company.model";
import { EmploymentTitleModel } from "../models/employment-title.model";

export function employmentTitleRepository(companyId: string) {
    if (companyId === process.env.OG_COMPANY_ID) {
        return EmploymentTitleModel;
    }

    return companyModel(EmploymentTitleModel, companyId);
}
