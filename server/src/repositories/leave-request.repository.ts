import { companyModel } from "../models/company.model";
import { LeaveRequestModel } from "../models/leave-request.model";

export function leaveRequestRepository(companyId: string) {
    return companyModel(LeaveRequestModel, companyId);
}
