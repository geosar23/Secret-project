import { UserDocumentModel } from "../models/user-document.model";

export function userDocumentRepository() {
    // UserDocuments are always queried with a company filter at the service layer.
    return UserDocumentModel;
}
