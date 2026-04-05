import { companyModel } from "../models/company.model";
import { UserModel } from "../models/user.model";
import { config } from "../config/env";

export function userRepository(companyId: string) {
    if (companyId === config.OG_COMPANY_ID) {
        return UserModel;
    }
    return companyModel(UserModel, companyId);
}
