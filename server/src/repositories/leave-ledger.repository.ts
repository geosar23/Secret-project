import { companyModel } from "../models/company.model";
import { LeaveLedgerModel } from "../models/leave-ledger.model";

export function leaveLedgerRepository(companyId: string) {
    return companyModel(LeaveLedgerModel, companyId);
}
