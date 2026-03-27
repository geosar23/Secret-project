import { companyModel } from "../models/company.model";
import { CountryModel } from "../models/country.model";

export function countryRepository(companyId: string) {
    if (companyId === process.env.OG_COMPANY_ID) {
        return CountryModel;
    }

    return companyModel(CountryModel, companyId);
}
