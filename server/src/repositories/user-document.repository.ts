import { UserDocumentModel } from "../models/user-document.model";
import { config } from "../config/env";

export function userDocumentRepository(companyId: string) {
    // UserDocuments always include a company field and are always queried with it —
    // no need for the companyModel factory here; we filter by company on every query.
    // OG company still uses the base model without a mandatory company filter.
    if (companyId === config.OG_COMPANY_ID) {
        return UserDocumentModel;
    }
    // Scoped access: callers must include { company: companyId } in their queries.
    // We return the model and enforce the filter at the service layer for clarity.
    return UserDocumentModel;
}
