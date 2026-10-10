import { companyModel } from "../models/company.model";
import { LeavePolicyModel } from "../models/leave-policy.model";

export function leavePolicyRepository(companyId: string) {
    return companyModel(LeavePolicyModel, companyId);
}
