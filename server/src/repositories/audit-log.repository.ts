import { companyModel } from "../models/company.model";
import { AuditLogModel } from "../models/audit-log.model";

export function auditLogRepository(companyId: string) {
    return companyModel(AuditLogModel, companyId);
}
