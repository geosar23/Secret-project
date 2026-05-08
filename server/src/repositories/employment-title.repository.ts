import { companyModel } from "../models/company.model";
import { EmploymentTitleModel } from "../models/employment-title.model";

export function employmentTitleRepository(companyId: string) {
    return companyModel(EmploymentTitleModel, companyId);
}
