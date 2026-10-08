import { companyModel } from "../models/company.model";
import { ApprovalFlowModel } from "../models/approval-flow.model";

export function approvalFlowRepository(companyId: string) {
    return companyModel(ApprovalFlowModel, companyId);
}
