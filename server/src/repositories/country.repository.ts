import { companyModel } from "../models/company.model";
import { CountryModel } from "../models/country.model";
import { config } from "../config/env";

export function countryRepository(companyId: string) {
    if (companyId === config.OG_COMPANY_ID) {
        return CountryModel;
    }

    return companyModel(CountryModel, companyId);
}
