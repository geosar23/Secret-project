import { CompanyModel } from "../models/company.model";

export const CompanyService = {
    getById: (id: string) => CompanyModel.findById(id).lean(),
};
