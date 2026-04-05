import { companyModel } from "../models/company.model";
import { EmploymentTitleModel } from "../models/employment-title.model";
import { config } from "../config/env";

export function employmentTitleRepository(companyId: string) {
    if (companyId === config.OG_COMPANY_ID) {
        return EmploymentTitleModel;
    }

    return companyModel(EmploymentTitleModel, companyId);
}
