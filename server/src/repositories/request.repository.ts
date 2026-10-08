import { companyModel } from "../models/company.model";
import { RequestModel } from "../models/request.model";

export function requestRepository(companyId: string) {
    return companyModel(RequestModel, companyId);
}
