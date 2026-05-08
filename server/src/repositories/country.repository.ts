import { companyModel } from "../models/company.model";
import { CountryModel } from "../models/country.model";

export function countryRepository(companyId: string) {
    return companyModel(CountryModel, companyId);
}
