import { companyModel } from "../models/company.model";
import { LeaveCompanySettingsModel } from "../models/leave-company-settings.model";

export function leaveCompanySettingsRepository(companyId: string) {
    return companyModel(LeaveCompanySettingsModel, companyId);
}
