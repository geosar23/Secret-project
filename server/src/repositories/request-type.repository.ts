import { companyModel } from "../models/company.model";
import { RequestTypeModel } from "../models/request-type.model";

export function requestTypeRepository(companyId: string) {
    return companyModel(RequestTypeModel, companyId);
}
