import { companyModel } from "../models/company.model";
import { LeaveTypeModel } from "../models/leave-type.model";

export function leaveTypeRepository(companyId: string) {
    return companyModel(LeaveTypeModel, companyId);
}
