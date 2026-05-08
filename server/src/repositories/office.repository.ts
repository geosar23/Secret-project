import { companyModel } from "../models/company.model";
import { OfficeModel } from "../models/office.model";

export function officeRepository(companyId: string) {
    return companyModel(OfficeModel, companyId);
}
