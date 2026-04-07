import { companyModel } from "../models/company.model";
import { OfficeModel } from "../models/office.model";
import { config } from "../config/env";

export function officeRepository(companyId: string) {
    if (companyId === config.OG_COMPANY_ID) {
        return OfficeModel;
    }
    return companyModel(OfficeModel, companyId);
}
