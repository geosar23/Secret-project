import { CompanyModel } from "../models/company.model";
import { ICompany } from "../interfaces/company.interface";

/** Companies are the tenant root, so this repository is intentionally not company-scoped. */
export function companyRepository() {
    return {
        findById(id: string) {
            return CompanyModel.findById(id);
        },

        existsBySlug(slug: string) {
            return CompanyModel.exists({ slug });
        },

        create(data: Partial<ICompany>) {
            return CompanyModel.create(data);
        },
    };
}
