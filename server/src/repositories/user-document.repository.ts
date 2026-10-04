import { companyModel } from "../models/company.model";
import { UserDocumentModel } from "../models/user-document.model";

export function userDocumentRepository(companyId: string) {
    return companyModel(UserDocumentModel, companyId);
}
