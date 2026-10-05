import { companyRepository } from "../repositories/company.repository";

export const CompanyService = {
    getById: (id: string) => companyRepository().findById(id).lean(),
};
